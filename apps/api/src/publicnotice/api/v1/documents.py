"""Documents API — async upload, list, get.

Upload flow (async):
1. Client POSTs the PDF (multipart/form-data).
2. We validate, persist a ``Document`` row with status ``PENDING`` and **commit
   immediately**, then return ``202 Accepted`` with the document id.
3. A FastAPI ``BackgroundTask`` opens its own DB session + adapters and runs
   the heavy ingestion pipeline (parse → chunk → embed → store), transitioning
   the row to ``INDEXING`` and finally ``INDEXED`` or ``FAILED``.
4. The client polls ``GET /documents/{id}`` until status is terminal.

Why a fresh session in the background task: the request-scoped ``AsyncSession``
is closed as soon as the HTTP response is returned, so any work scheduled
afterwards must own its session lifecycle.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from starlette.responses import Response

from publicnotice.api.deps import (
    DocumentRepositoryDep,
    SessionDep,
    SettingsDep,
)
from publicnotice.api.providers import (
    build_chunker,
    build_embeddings,
    build_pdf_parser,
)
from publicnotice.api.rate_limit import limiter
from publicnotice.adapters.vectorstore.pgvector import PgVectorStore
from publicnotice.config import Settings, get_settings
from publicnotice.domain.document import Document, DocumentStatus
from publicnotice.infra.db import SessionLocal
from publicnotice.infra.logging import get_logger
from publicnotice.infra.repositories import DocumentRepository
from publicnotice.services.ingestion import IngestionService

router = APIRouter(prefix="/documents", tags=["documents"])
log = get_logger(__name__)

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
_UPLOAD_RATE_LIMIT = get_settings().rate_limit_upload


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    pages: int
    status: DocumentStatus
    error_message: str | None
    created_at: datetime

    @classmethod
    def from_domain(cls, doc: Document) -> "DocumentResponse":
        return cls(
            id=doc.id,
            filename=doc.filename,
            pages=doc.pages,
            status=doc.status,
            error_message=doc.error_message,
            created_at=doc.created_at,
        )


async def _process_in_background(document_id: UUID, data: bytes, settings: Settings) -> None:
    """Run the full ingestion pipeline in a fresh session/scope.

    Errors are caught and logged — the document row already carries the
    ``FAILED`` status set by the service.
    """
    async with SessionLocal() as session:
        try:
            repo = DocumentRepository(session)
            store = PgVectorStore(session)
            service = IngestionService(
                pdf_parser=build_pdf_parser(settings),
                chunker=build_chunker(settings),
                embeddings=build_embeddings(settings),
                vector_store=store,
                documents=repo,
            )
            try:
                await service.process(document_id=document_id, data=data)
                await session.commit()
            except Exception:
                await session.commit()  # persist FAILED status before re-raising
                raise
        except Exception as exc:  # noqa: BLE001
            log.error(
                "background_ingestion_failed",
                document_id=str(document_id),
                error=str(exc),
            )


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF (async ingestion)",
)
@limiter.limit(_UPLOAD_RATE_LIMIT)
async def create_document(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    settings: SettingsDep,
    repo: DocumentRepositoryDep,
    file: UploadFile = File(...),
) -> DocumentResponse:
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type: {file.content_type}",
        )

    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (>25 MB)")
    if not data:
        raise HTTPException(status_code=422, detail="Empty file")

    document = Document(
        filename=file.filename or "unnamed.pdf",
        status=DocumentStatus.PENDING,
    )
    document = await repo.add(document)
    await session.commit()

    background_tasks.add_task(_process_in_background, document.id, data, settings)
    log.info("document_accepted", document_id=str(document.id), filename=document.filename)

    return DocumentResponse.from_domain(document)


@router.get("", response_model=list[DocumentResponse])
async def list_documents(repo: DocumentRepositoryDep) -> list[DocumentResponse]:
    docs = await repo.list_all()
    return [DocumentResponse.from_domain(d) for d in docs]


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    session: SessionDep,
    repo: DocumentRepositoryDep,
) -> None:
    deleted = await repo.delete(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    await session.commit()
    log.info("document_deleted", document_id=str(document_id))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID, repo: DocumentRepositoryDep) -> DocumentResponse:
    doc = await repo.get(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.from_domain(doc)
