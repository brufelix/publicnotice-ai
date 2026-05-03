"""Document entity — a PDF that has been (or will be) ingested."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4


class DocumentStatus(StrEnum):
    PENDING = "pending"
    INDEXING = "indexing"
    INDEXED = "indexed"
    FAILED = "failed"


@dataclass(slots=True)
class Document:
    """A public-notice PDF and its ingestion metadata."""

    filename: str
    pages: int = 0
    status: DocumentStatus = DocumentStatus.PENDING
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    error_message: str | None = None
