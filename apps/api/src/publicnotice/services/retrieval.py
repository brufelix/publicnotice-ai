"""Retrieval service: embed query → top-K via vector store."""

from __future__ import annotations

from uuid import UUID

from publicnotice.adapters.embeddings.base import EmbeddingsProvider
from publicnotice.adapters.vectorstore.base import RetrievedChunk, VectorStore


class RetrievalService:
    """Pulls the most relevant chunks for a user query."""

    def __init__(
        self,
        embeddings: EmbeddingsProvider,
        vector_store: VectorStore,
    ) -> None:
        self._embeddings = embeddings
        self._store = vector_store

    async def retrieve(
        self,
        query: str,
        *,
        top_k: int = 5,
        document_id: UUID | None = None,
    ) -> list[RetrievedChunk]:
        query = query.strip()
        if not query:
            return []
        [vector] = await self._embeddings.embed([query])
        return await self._store.search(vector, top_k=top_k, document_id=document_id)
