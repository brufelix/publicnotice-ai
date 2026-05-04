"""Embeddings port."""

from collections.abc import Sequence
from typing import Protocol


class EmbeddingsProvider(Protocol):
    """Port: turn text into dense vectors."""

    @property
    def dimensions(self) -> int:
        """Output vector dimensionality (must match `chunks.embedding` column)."""
        ...

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of texts. Order is preserved."""
        ...
