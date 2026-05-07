"""Ingestion service: parse PDF → chunk → embed → store.

Pure orchestration — depends on `Protocol`s from `adapters/`, never on
concrete implementations. Wiring happens in `api/deps.py`.

Two entry points:
- ``ingest(filename, data)``: creates a new ``Document`` and runs the pipeline
  synchronously. Used by tests and the seed script.
- ``process(document_id, data)``: runs the pipeline against an existing,
  already-persisted document. Used by the async (BackgroundTasks) flow so the
  HTTP request can return ``202`` immediately.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from publicnotice.adapters.chunker.base import Chunker
from publicnotice.adapters.embeddings.base import EmbeddingsProvider
from publicnotice.adapters.pdf.base import PdfParser
from publicnotice.adapters.vectorstore.base import VectorStore
from publicnotice.domain.chunk import Chunk
from publicnotice.domain.document import Document, DocumentStatus
from publicnotice.domain.exceptions import ExternalServiceError, NotFoundError, ValidationError
from publicnotice.infra.logging import get_logger
from publicnotice.infra.repositories import DocumentRepository

log = get_logger(__name__)

_EMBED_BATCH_SIZE = 32


@dataclass(slots=True)
class IngestionResult:
    document: Document
    chunks_created: int


class IngestionService:
    """Orchestrates the full ingestion pipeline for one PDF."""

    def __init__(
        self,
        *,
        pdf_parser: PdfParser,
        chunker: Chunker,
        embeddings: EmbeddingsProvider,
        vector_store: VectorStore,
        documents: DocumentRepository,
    ) -> None:
        self._parser = pdf_parser
        self._chunker = chunker
        self._embeddings = embeddings
        self._store = vector_store
        self._documents = documents

    async def ingest(self, *, filename: str, data: bytes) -> IngestionResult:
        """Create a new document then run the pipeline (sync flow)."""
        document = Document(filename=filename, status=DocumentStatus.INDEXING)
        document = await self._documents.add(document)
        return await self._run_pipeline(document, data)

    async def process(self, *, document_id: UUID, data: bytes) -> IngestionResult:
        """Run the pipeline against an already-persisted document (async flow)."""
        document = await self._documents.get(document_id)
        if document is None:
            raise NotFoundError(f"Document {document_id} not found")
        await self._documents.update_status(document.id, DocumentStatus.INDEXING)
        document.status = DocumentStatus.INDEXING
        return await self._run_pipeline(document, data)

    async def _run_pipeline(self, document: Document, data: bytes) -> IngestionResult:
        """Shared pipeline body. Persists FAILED status on errors then re-raises."""
        log.info("ingestion_started", document_id=str(document.id), filename=document.filename)

        try:
            pages = self._parser.parse(data)
            if not pages:
                await self._documents.update_status(
                    document.id,
                    DocumentStatus.FAILED,
                    error_message="PDF has no extractable pages",
                )
                raise ValidationError("PDF has no extractable pages")

            pieces = self._chunker.split(pages)
            if not pieces:
                await self._documents.update_status(
                    document.id,
                    DocumentStatus.FAILED,
                    pages=len(pages),
                    error_message="No extractable text (scanned PDF?)",
                )
                raise ValidationError("PDF has no extractable text (likely scanned)")

            embeddings: list[list[float]] = []
            for start in range(0, len(pieces), _EMBED_BATCH_SIZE):
                batch = [p.content for p in pieces[start : start + _EMBED_BATCH_SIZE]]
                embeddings.extend(await self._embeddings.embed(batch))

            if len(embeddings) != len(pieces):
                raise ExternalServiceError(
                    f"Embeddings count mismatch: got {len(embeddings)} for {len(pieces)} chunks"
                )

            chunks = [
                Chunk(
                    document_id=document.id,
                    content=piece.content,
                    page=piece.page,
                    chunk_index=piece.chunk_index,
                    embedding=embedding,
                )
                for piece, embedding in zip(pieces, embeddings, strict=True)
            ]
            await self._store.add(chunks)
            await self._documents.update_status(
                document.id,
                DocumentStatus.INDEXED,
                pages=len(pages),
            )
            log.info(
                "ingestion_completed",
                document_id=str(document.id),
                pages=len(pages),
                chunks=len(chunks),
            )
            document.status = DocumentStatus.INDEXED
            document.pages = len(pages)
            return IngestionResult(document=document, chunks_created=len(chunks))

        except ValidationError:
            raise
        except Exception as exc:
            log.error("ingestion_failed", document_id=str(document.id), error=str(exc))
            await self._documents.update_status(
                document.id,
                DocumentStatus.FAILED,
                error_message=str(exc)[:500],
            )
            raise
