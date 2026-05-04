"""pgvector-backed vector store."""

from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from publicnotice.adapters.vectorstore.base import RetrievedChunk
from publicnotice.domain.chunk import Chunk
from publicnotice.infra.models import ChunkORM


class PgVectorStore:
    """Stores chunks in the `chunks` table and queries via cosine distance."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, chunks: Sequence[Chunk]) -> None:
        if not chunks:
            return
        rows = [
            ChunkORM(
                id=c.id,
                document_id=c.document_id,
                content=c.content,
                page=c.page,
                chunk_index=c.chunk_index,
                embedding=c.embedding,
                chunk_metadata=c.metadata,
            )
            for c in chunks
        ]
        self._session.add_all(rows)
        await self._session.flush()

    async def search(
        self,
        query_embedding: Sequence[float],
        *,
        top_k: int = 5,
        document_id: UUID | None = None,
    ) -> list[RetrievedChunk]:
        # `<=>` is the cosine-distance operator from pgvector
        distance = ChunkORM.embedding.cosine_distance(list(query_embedding)).label("distance")
        stmt = select(ChunkORM, distance).where(ChunkORM.embedding.is_not(None))
        if document_id is not None:
            stmt = stmt.where(ChunkORM.document_id == document_id)
        stmt = stmt.order_by(distance).limit(top_k)

        result = await self._session.execute(stmt)
        out: list[RetrievedChunk] = []
        for row, dist in result.all():
            out.append(
                RetrievedChunk(
                    chunk=Chunk(
                        id=row.id,
                        document_id=row.document_id,
                        content=row.content,
                        page=row.page,
                        chunk_index=row.chunk_index,
                        embedding=None,  # don't ship vectors back to callers
                        metadata=row.chunk_metadata or {},
                    ),
                    score=1.0 - float(dist),  # cosine similarity in [-1, 1]
                )
            )
        return out
