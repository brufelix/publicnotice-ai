"""Chunker port."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from publicnotice.adapters.pdf.base import PageText


@dataclass(slots=True, frozen=True)
class ChunkPiece:
    """A chunk produced by a chunker, with provenance info for citations."""

    content: str
    page: int
    chunk_index: int


class Chunker(Protocol):
    """Port: split per-page text into retrieval-friendly chunks."""

    def split(self, pages: Sequence[PageText]) -> list[ChunkPiece]:
        ...
