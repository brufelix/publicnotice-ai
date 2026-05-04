"""PDF parser port (interface)."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True, frozen=True)
class PageText:
    """Text extracted from a single PDF page (1-indexed page number)."""

    page: int
    text: str


class PdfParser(Protocol):
    """Port: extract text per page from a PDF."""

    def parse(self, data: bytes) -> list[PageText]:
        """Return one `PageText` per page, in order. May return empty text for image-only pages."""
        ...
