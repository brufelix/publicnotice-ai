"""Tests for `IngestionService` using fake adapters (no I/O)."""

from collections.abc import Sequence
from uuid import UUID

import pytest

from publicnotice.adapters.chunker.base import ChunkPiece
from publicnotice.adapters.pdf.base import PageText
from publicnotice.domain.chunk import Chunk
from publicnotice.domain.document import Document, DocumentStatus
from publicnotice.domain.exceptions import ValidationError
from publicnotice.services.ingestion import IngestionService


class FakePdfParser:
    def __init__(self, pages: list[PageText]) -> None:
        self.pages = pages

    def parse(self, data: bytes) -> list[PageText]:
        return self.pages


class FakeChunker:
    def __init__(self, pieces: list[ChunkPiece]) -> None:
        self.pieces = pieces

    def split(self, pages: Sequence[PageText]) -> list[ChunkPiece]:
        return self.pieces


class FakeEmbeddings:
    dimensions = 4

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        return [[float(i), 0.0, 0.0, 0.0] for i, _ in enumerate(texts)]


class FakeVectorStore:
    def __init__(self) -> None:
        self.added: list[Chunk] = []

    async def add(self, chunks: Sequence[Chunk]) -> None:
        self.added.extend(chunks)

    async def search(self, *args, **kwargs):  # pragma: no cover - unused here
        return []


class FakeDocumentRepository:
    def __init__(self) -> None:
        self.docs: dict[UUID, Document] = {}

    async def add(self, document: Document) -> Document:
        self.docs[document.id] = document
        return document

    async def get(self, document_id: UUID) -> Document | None:
        return self.docs.get(document_id)

    async def list_all(self, *, limit: int = 100) -> list[Document]:
        return list(self.docs.values())

    async def update_status(
        self,
        document_id: UUID,
        status: DocumentStatus,
        *,
        pages: int | None = None,
        error_message: str | None = None,
    ) -> None:
        doc = self.docs[document_id]
        doc.status = status
        if pages is not None:
            doc.pages = pages
        if error_message is not None:
            doc.error_message = error_message


def _make_service(
    pages: list[PageText] | None = None,
    pieces: list[ChunkPiece] | None = None,
) -> tuple[IngestionService, FakeVectorStore, FakeDocumentRepository, FakeEmbeddings]:
    pages = pages if pages is not None else [PageText(page=1, text="some text")]
    pieces = pieces if pieces is not None else [
        ChunkPiece(content="some text", page=1, chunk_index=0)
    ]
    store = FakeVectorStore()
    repo = FakeDocumentRepository()
    embeddings = FakeEmbeddings()
    service = IngestionService(
        pdf_parser=FakePdfParser(pages),
        chunker=FakeChunker(pieces),
        embeddings=embeddings,
        vector_store=store,
        documents=repo,  # type: ignore[arg-type]
    )
    return service, store, repo, embeddings


@pytest.mark.unit
async def test_ingest_happy_path_persists_document_and_chunks() -> None:
    pages = [PageText(page=1, text="hi"), PageText(page=2, text="ho")]
    pieces = [
        ChunkPiece(content="hi", page=1, chunk_index=0),
        ChunkPiece(content="ho", page=2, chunk_index=1),
    ]
    service, store, repo, embeddings = _make_service(pages, pieces)

    result = await service.ingest(filename="edital.pdf", data=b"%PDF-...")

    assert result.chunks_created == 2
    assert result.document.status == DocumentStatus.INDEXED
    assert result.document.pages == 2
    assert len(store.added) == 2
    assert all(c.embedding is not None and len(c.embedding) == 4 for c in store.added)
    assert embeddings.calls == [["hi", "ho"]]
    assert repo.docs[result.document.id].status == DocumentStatus.INDEXED


@pytest.mark.unit
async def test_ingest_marks_failed_when_no_text_extracted() -> None:
    service, store, repo, _ = _make_service(
        pages=[PageText(page=1, text="image-only")],
        pieces=[],
    )

    with pytest.raises(ValidationError):
        await service.ingest(filename="scan.pdf", data=b"%PDF-...")

    assert store.added == []
    persisted = next(iter(repo.docs.values()))
    assert persisted.status == DocumentStatus.FAILED


@pytest.mark.unit
async def test_ingest_propagates_validation_when_pdf_empty() -> None:
    service, _, repo, _ = _make_service(pages=[], pieces=[])
    with pytest.raises(ValidationError):
        await service.ingest(filename="x.pdf", data=b"")
    assert next(iter(repo.docs.values())).status == DocumentStatus.FAILED


@pytest.mark.unit
async def test_process_runs_pipeline_for_existing_pending_document() -> None:
    pages = [PageText(page=1, text="hi")]
    pieces = [ChunkPiece(content="hi", page=1, chunk_index=0)]
    service, store, repo, _ = _make_service(pages, pieces)

    # Pre-create a PENDING document (simulating the async accept step)
    pending = Document(filename="edital.pdf", status=DocumentStatus.PENDING)
    await repo.add(pending)

    result = await service.process(document_id=pending.id, data=b"%PDF-...")

    assert result.document.id == pending.id
    assert result.document.status == DocumentStatus.INDEXED
    assert result.chunks_created == 1
    assert len(store.added) == 1
    assert repo.docs[pending.id].status == DocumentStatus.INDEXED
