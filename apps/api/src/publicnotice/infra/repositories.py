"""Repository for `Document`s — persistence boundary."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from publicnotice.domain.document import Document, DocumentStatus
from publicnotice.infra.models import DocumentORM


def _to_domain(row: DocumentORM) -> Document:
    return Document(
        id=row.id,
        filename=row.filename,
        pages=row.pages,
        status=DocumentStatus(row.status),
        error_message=row.error_message,
        created_at=row.created_at,
    )


class DocumentRepository:
    """CRUD for `documents`. Keeps ORM details out of services."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, document: Document) -> Document:
        row = DocumentORM(
            id=document.id,
            filename=document.filename,
            pages=document.pages,
            status=document.status.value,
            error_message=document.error_message,
        )
        self._session.add(row)
        await self._session.flush()
        return _to_domain(row)

    async def get(self, document_id: UUID) -> Document | None:
        row = await self._session.get(DocumentORM, document_id)
        return _to_domain(row) if row else None

    async def list_all(self, *, limit: int = 100) -> list[Document]:
        stmt = select(DocumentORM).order_by(DocumentORM.created_at.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return [_to_domain(r) for r in result.scalars().all()]

    async def update_status(
        self,
        document_id: UUID,
        status: DocumentStatus,
        *,
        pages: int | None = None,
        error_message: str | None = None,
    ) -> None:
        row = await self._session.get(DocumentORM, document_id)
        if row is None:
            return
        row.status = status.value
        if pages is not None:
            row.pages = pages
        if error_message is not None:
            row.error_message = error_message
        await self._session.flush()

    async def delete(self, document_id: UUID) -> bool:
        row = await self._session.get(DocumentORM, document_id)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True
