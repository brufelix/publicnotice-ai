"""Tests for `RetrievalService` and `ChatService` with fakes."""

from collections.abc import AsyncIterator, Sequence
from uuid import UUID, uuid4

import pytest

from publicnotice.adapters.llm.base import ChatMessage
from publicnotice.adapters.vectorstore.base import RetrievedChunk
from publicnotice.domain.chunk import Chunk
from publicnotice.services.chat import (
    ChatService,
    CitationsEvent,
    DoneEvent,
    TokenEvent,
)
from publicnotice.services.retrieval import RetrievalService


class FakeEmbeddings:
    dimensions = 4

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [[0.1, 0.2, 0.3, 0.4] for _ in texts]


class FakeStore:
    def __init__(self, chunks: list[RetrievedChunk]) -> None:
        self.chunks = chunks
        self.last_kwargs: dict[str, object] = {}

    async def add(self, chunks):  # pragma: no cover - unused
        return None

    async def search(
        self,
        query_embedding: Sequence[float],
        *,
        top_k: int = 5,
        document_id: UUID | None = None,
    ) -> list[RetrievedChunk]:
        self.last_kwargs = {"top_k": top_k, "document_id": document_id}
        return self.chunks[:top_k]


class FakeLLM:
    def __init__(self, tokens: list[str]) -> None:
        self.tokens = tokens
        self.last_messages: list[ChatMessage] = []

    async def stream(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        self.last_messages = list(messages)
        for t in self.tokens:
            yield t


def _make_chunk(doc_id: UUID, page: int, content: str) -> RetrievedChunk:
    return RetrievedChunk(
        chunk=Chunk(
            id=uuid4(),
            document_id=doc_id,
            content=content,
            page=page,
            chunk_index=page,
        ),
        score=0.9,
    )


@pytest.mark.unit
async def test_retrieval_passes_filters() -> None:
    store = FakeStore([])
    service = RetrievalService(FakeEmbeddings(), store)
    doc_id = uuid4()

    await service.retrieve("query", top_k=3, document_id=doc_id)

    assert store.last_kwargs == {"top_k": 3, "document_id": doc_id}


@pytest.mark.unit
async def test_retrieval_returns_empty_for_blank_query() -> None:
    store = FakeStore([_make_chunk(uuid4(), 1, "x")])
    service = RetrievalService(FakeEmbeddings(), store)
    assert await service.retrieve("   ") == []


@pytest.mark.unit
async def test_chat_emits_citations_then_tokens_then_done() -> None:
    doc_id = uuid4()
    store = FakeStore([
        _make_chunk(doc_id, 1, "Inscrições até 30/06."),
        _make_chunk(doc_id, 2, "Taxa: R$ 80."),
    ])
    llm = FakeLLM(["A ", "resposta."])
    service = ChatService(RetrievalService(FakeEmbeddings(), store), llm, top_k=2)

    events = [e async for e in service.stream("Quando abrem as inscrições?")]

    assert isinstance(events[0], CitationsEvent)
    assert [c.index for c in events[0].citations] == [1, 2]
    assert [c.page for c in events[0].citations] == [1, 2]

    tokens = [e.delta for e in events if isinstance(e, TokenEvent)]
    assert "".join(tokens) == "A resposta."
    assert isinstance(events[-1], DoneEvent)

    # System prompt is in there, plus a single user message with the context block
    roles = [m.role for m in llm.last_messages]
    assert roles[0] == "system"
    assert roles[-1] == "user"
    assert "[1]" in llm.last_messages[-1].content
    assert "[2]" in llm.last_messages[-1].content


@pytest.mark.unit
async def test_chat_handles_empty_retrieval() -> None:
    store = FakeStore([])
    llm = FakeLLM(["should not be called"])
    service = ChatService(RetrievalService(FakeEmbeddings(), store), llm)

    events = [e async for e in service.stream("nada relacionado")]

    assert isinstance(events[0], CitationsEvent)
    assert events[0].citations == []
    # LLM is bypassed; canned message instead
    assert llm.last_messages == []
    assert isinstance(events[-1], DoneEvent)
    assert any(isinstance(e, TokenEvent) for e in events)
