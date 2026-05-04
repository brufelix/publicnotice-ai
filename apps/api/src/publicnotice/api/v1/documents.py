"""Documents API — upload, list, get."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from publicnotice.api.deps import (
    DocumentRepositoryDep,
    IngestionServiceDep,
    SessionDep,
)
from publicnotice.domain.document import Document, DocumentStatus
from publicnotice.domain.exceptions import ValidationError

router = APIRouter(prefix="/documents", tags=["documents"])

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    pages: int
    status: DocumentStatus
    error_message: str | None
    created_at: datetime

    @classmethod
    def from_domain(cls, doc: Document) -> DocumentResponse:
        return cls(
            id=doc.id,
            filename=doc.filename,
            pages=doc.pages,
            status=doc.status,
            error_message=doc.error_message,
            created_at=doc.created_at,
        )


class IngestionResponse(BaseModel):
    document: DocumentResponse
    chunks_created: int = Field(ge=0)


@router.post(
    "",
    response_model=IngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a PDF (synchronous)",
)
async def create_document(
    service: IngestionServiceDep,
    session: SessionDep,
    file: UploadFile = File(...),
) -> IngestionResponse:
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

    try:
        result = await service.ingest(filename=file.filename or "unnamed.pdf", data=data)
    except ValidationError:
        await session.commit()  # persist FAILED status
        raise
    await session.commit()
    return IngestionResponse(
        document=DocumentResponse.from_domain(result.document),
        chunks_created=result.chunks_created,
    )


@router.get("", response_model=list[DocumentResponse])
async def list_documents(repo: DocumentRepositoryDep) -> list[DocumentResponse]:
    docs = await repo.list_all()
    return [DocumentResponse.from_domain(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID, repo: DocumentRepositoryDep) -> DocumentResponse:
    doc = await repo.get(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.from_domain(doc)
