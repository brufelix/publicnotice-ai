"""PyMuPDF-based PDF parser."""

from __future__ import annotations

import pymupdf

from publicnotice.adapters.pdf.base import PageText
from publicnotice.domain.exceptions import ValidationError


class PyMuPDFParser:
    """Parses PDFs using PyMuPDF (fitz). Pure text extraction, no OCR."""

    def parse(self, data: bytes) -> list[PageText]:
        if not data:
            raise ValidationError("Empty PDF payload")
        try:
            doc = pymupdf.open(stream=data, filetype="pdf")
        except Exception as exc:  # pragma: no cover - upstream library error
            raise ValidationError(f"Invalid PDF file: {exc}") from exc

        try:
            pages: list[PageText] = []
            for index, page in enumerate(doc, start=1):
                text = page.get_text("text") or ""
                pages.append(PageText(page=index, text=text.strip()))
            return pages
        finally:
            doc.close()
