"""Seed script: ingest all PDFs from `data/sample/` into the running DB.

Usage (inside the api container):
    uv run python scripts/seed.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from publicnotice.api.providers import (
    build_chunker,
    build_embeddings,
    build_pdf_parser,
)
from publicnotice.adapters.vectorstore.pgvector import PgVectorStore
from publicnotice.config import get_settings
from publicnotice.infra.db import SessionLocal
from publicnotice.infra.logging import configure_logging, get_logger
from publicnotice.infra.repositories import DocumentRepository
from publicnotice.services.ingestion import IngestionService

# In the container, /app/data is mounted from repo's ./data
SAMPLE_DIR = Path("/app/data/sample")
log = get_logger("seed")


async def _main() -> int:
    configure_logging(level="INFO", json_logs=False)
    settings = get_settings()

    sample_dir = SAMPLE_DIR if SAMPLE_DIR.exists() else Path(__file__).resolve().parents[2] / "data" / "sample"
    pdfs = sorted(sample_dir.glob("*.pdf"))
    if not pdfs:
        log.warning("seed_no_pdfs", directory=str(sample_dir))
        return 0

    log.info("seed_starting", count=len(pdfs), directory=str(sample_dir))

    pdf_parser = build_pdf_parser(settings)
    chunker = build_chunker(settings)
    embeddings = build_embeddings(settings)

    failures = 0
    for path in pdfs:
        async with SessionLocal() as session:
            service = IngestionService(
                pdf_parser=pdf_parser,
                chunker=chunker,
                embeddings=embeddings,
                vector_store=PgVectorStore(session),
                documents=DocumentRepository(session),
            )
            try:
                result = await service.ingest(filename=path.name, data=path.read_bytes())
                await session.commit()
                log.info(
                    "seed_ingested",
                    file=path.name,
                    document_id=str(result.document.id),
                    pages=result.document.pages,
                    chunks=result.chunks_created,
                )
            except Exception as exc:  # noqa: BLE001
                await session.commit()  # persist FAILED status
                failures += 1
                log.error("seed_failed", file=path.name, error=str(exc))

    log.info("seed_completed", total=len(pdfs), failures=failures)
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
