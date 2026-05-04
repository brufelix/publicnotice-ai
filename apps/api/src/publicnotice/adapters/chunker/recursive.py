"""Recursive character text splitter, page-aware.

Approximates the LangChain `RecursiveCharacterTextSplitter` behavior:
tries to break on the largest possible separator first (paragraph,
newline, sentence, space, char) to keep chunks semantically coherent.

Token counts are approximated as `len(text) / 4` (a common heuristic
for English/Portuguese text with subword tokenizers); we keep things
in characters internally to stay dependency-free.
"""

from __future__ import annotations

from collections.abc import Sequence

from publicnotice.adapters.chunker.base import ChunkPiece
from publicnotice.adapters.pdf.base import PageText

# ~500 tokens with overlap ~50 → ~2000 chars / ~200 chars overlap
_DEFAULT_CHUNK_CHARS = 2000
_DEFAULT_OVERLAP_CHARS = 200
_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Recursively split `text` to fit within `chunk_size`, with overlap."""
    if len(text) <= chunk_size:
        cleaned = text.strip()
        return [cleaned] if cleaned else []

    # Pick the first separator that actually appears, else hard split
    separator = next((s for s in _SEPARATORS if s and s in text), "")
    if not separator:
        # Hard character split
        pieces = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size - overlap)]
        return [p.strip() for p in pieces if p.strip()]

    parts = text.split(separator)
    chunks: list[str] = []
    buffer = ""
    for part in parts:
        candidate = part if not buffer else f"{buffer}{separator}{part}"
        if len(candidate) <= chunk_size:
            buffer = candidate
            continue

        if buffer:
            chunks.append(buffer.strip())
            # Carry overlap forward
            tail = buffer[-overlap:] if overlap and len(buffer) > overlap else ""
            buffer = f"{tail}{separator}{part}" if tail else part
        else:
            # Single `part` is bigger than chunk_size → recurse with finer separator
            chunks.extend(_split_text(part, chunk_size, overlap))
            buffer = ""

    if buffer.strip():
        chunks.append(buffer.strip())

    return [c for c in chunks if c]


class RecursiveChunker:
    """Page-aware recursive splitter. Each output chunk maps to exactly one page."""

    def __init__(
        self,
        chunk_size: int = _DEFAULT_CHUNK_CHARS,
        overlap: int = _DEFAULT_OVERLAP_CHARS,
    ) -> None:
        if overlap >= chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")
        self._chunk_size = chunk_size
        self._overlap = overlap

    def split(self, pages: Sequence[PageText]) -> list[ChunkPiece]:
        out: list[ChunkPiece] = []
        index = 0
        for page in pages:
            if not page.text:
                continue
            for piece in _split_text(page.text, self._chunk_size, self._overlap):
                out.append(ChunkPiece(content=piece, page=page.page, chunk_index=index))
                index += 1
        return out
