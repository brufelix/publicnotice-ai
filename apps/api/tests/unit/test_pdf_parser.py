"""Tests for the `PyMuPDFParser` adapter."""

import pymupdf
import pytest

from publicnotice.adapters.pdf.pymupdf import PyMuPDFParser
from publicnotice.domain.exceptions import ValidationError


def _make_pdf(pages: list[str]) -> bytes:
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        page.insert_text((72, 72), text)
    data: bytes = doc.tobytes()
    doc.close()
    return data


@pytest.mark.unit
def test_parses_each_page() -> None:
    pdf = _make_pdf(["Hello edital", "Página dois", "Last page"])
    pages = PyMuPDFParser().parse(pdf)

    assert [p.page for p in pages] == [1, 2, 3]
    assert "Hello edital" in pages[0].text
    assert "Página dois" in pages[1].text
    assert "Last page" in pages[2].text


@pytest.mark.unit
def test_empty_payload_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PyMuPDFParser().parse(b"")


@pytest.mark.unit
def test_invalid_pdf_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PyMuPDFParser().parse(b"not a pdf")
