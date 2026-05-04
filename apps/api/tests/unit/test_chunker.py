"""Tests for `RecursiveChunker`."""

import pytest

from publicnotice.adapters.chunker.recursive import RecursiveChunker
from publicnotice.adapters.pdf.base import PageText


@pytest.mark.unit
def test_returns_empty_for_empty_pages() -> None:
    chunker = RecursiveChunker()
    assert chunker.split([]) == []
    assert chunker.split([PageText(page=1, text="")]) == []


@pytest.mark.unit
def test_short_page_yields_single_chunk() -> None:
    chunker = RecursiveChunker(chunk_size=100, overlap=20)
    out = chunker.split([PageText(page=1, text="hello world")])
    assert len(out) == 1
    assert out[0].content == "hello world"
    assert out[0].page == 1
    assert out[0].chunk_index == 0


@pytest.mark.unit
def test_long_page_is_split_with_continuous_index() -> None:
    chunker = RecursiveChunker(chunk_size=50, overlap=10)
    text = "Parágrafo um.\n\n" + ("a" * 200) + "\n\nParágrafo final."
    out = chunker.split(
        [PageText(page=1, text=text), PageText(page=2, text="Página dois bem curta.")]
    )
    assert len(out) > 2
    assert [c.chunk_index for c in out] == list(range(len(out)))
    assert out[0].page == 1
    assert out[-1].page == 2


@pytest.mark.unit
def test_overlap_must_be_smaller_than_chunk_size() -> None:
    with pytest.raises(ValueError):
        RecursiveChunker(chunk_size=100, overlap=100)
