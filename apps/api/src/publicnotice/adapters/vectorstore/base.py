"""Vector store port."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from publicnotice.domain.chunk import Chunk


@dataclass(slots=True, frozen=True)
class RetrievedChunk:
    """A chunk returned by similarity search, with its score (cosine distance)."""

    chunk: Chunk
    score: float


class VectorStore(Protocol):
    """Port: persist embedded chunks and query by similarity."""

    async def add(self, chunks: Sequence[Chunk]) -> None:
        """Insert chunks (with embeddings) in bulk."""
        ...

    async def search(
        self,
        query_embedding: Sequence[float],
        *,
        top_k: int = 5,
        document_id: UUID | None = None,
    ) -> list[RetrievedChunk]:
        """Return top-K chunks ordered by cosine similarity (best first)."""
        ...
