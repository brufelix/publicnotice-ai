"""Chunk entity — a piece of a document, with optional embedding."""

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID, uuid4


@dataclass(slots=True)
class Chunk:
    """A text chunk extracted from a document, ready for embedding/retrieval."""

    document_id: UUID
    content: str
    page: int
    chunk_index: int
    id: UUID = field(default_factory=uuid4)
    embedding: list[float] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
