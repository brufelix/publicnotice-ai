"""Chat service: retrieve → build grounded prompt → stream LLM answer.

Yields a sequence of typed events suitable for SSE relay:
- ``CitationsEvent``: emitted once at the start with the chunks used
- ``TokenEvent``: emitted for every text delta from the LLM
- ``DoneEvent``: terminal marker
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from uuid import UUID

from publicnotice.adapters.llm.base import ChatMessage, LLMProvider
from publicnotice.adapters.vectorstore.base import RetrievedChunk
from publicnotice.services.retrieval import RetrievalService

_SYSTEM_PROMPT = """Você é um assistente especializado em editais de concursos públicos brasileiros.

REGRAS:
1. Responda APENAS com base nos trechos do edital fornecidos abaixo.
2. Cite a fonte usando colchetes numerados, ex: [1], [2]. Use os mesmos números do contexto.
3. Se a resposta não estiver no contexto, diga claramente: "Não encontrei essa informação no edital."
4. Seja objetivo, preciso e use linguagem clara em português.
5. Quando relevante, mencione a página do edital onde a informação aparece.
"""


@dataclass(slots=True, frozen=True)
class Citation:
    index: int  # 1-based, matches the [N] markers in the prompt
    chunk_id: UUID
    document_id: UUID
    page: int
    snippet: str
    score: float


@dataclass(slots=True, frozen=True)
class CitationsEvent:
    citations: list[Citation]


@dataclass(slots=True, frozen=True)
class TokenEvent:
    delta: str


@dataclass(slots=True, frozen=True)
class DoneEvent:
    pass


ChatEvent = CitationsEvent | TokenEvent | DoneEvent

_SNIPPET_CHARS = 240


def _build_context_block(chunks: Sequence[RetrievedChunk]) -> str:
    lines = []
    for i, rc in enumerate(chunks, start=1):
        lines.append(f"[{i}] (página {rc.chunk.page})\n{rc.chunk.content}")
    return "\n\n---\n\n".join(lines)


def _to_citations(chunks: Sequence[RetrievedChunk]) -> list[Citation]:
    return [
        Citation(
            index=i,
            chunk_id=rc.chunk.id,
            document_id=rc.chunk.document_id,
            page=rc.chunk.page,
            snippet=rc.chunk.content[:_SNIPPET_CHARS],
            score=rc.score,
        )
        for i, rc in enumerate(chunks, start=1)
    ]


class ChatService:
    """Grounded chat over the indexed editais."""

    def __init__(
        self,
        retrieval: RetrievalService,
        llm: LLMProvider,
        *,
        top_k: int = 5,
        temperature: float = 0.2,
    ) -> None:
        self._retrieval = retrieval
        self._llm = llm
        self._top_k = top_k
        self._temperature = temperature

    async def stream(
        self,
        question: str,
        *,
        document_id: UUID | None = None,
        history: Sequence[ChatMessage] = (),
    ) -> AsyncIterator[ChatEvent]:
        retrieved = await self._retrieval.retrieve(
            question, top_k=self._top_k, document_id=document_id
        )
        citations = _to_citations(retrieved)
        yield CitationsEvent(citations=citations)

        if not retrieved:
            for token in (
                "Não encontrei nenhum trecho relevante no edital para responder a essa pergunta."
            ).split(" "):
                yield TokenEvent(delta=token + " ")
            yield DoneEvent()
            return

        context_block = _build_context_block(retrieved)
        messages: list[ChatMessage] = [
            ChatMessage(role="system", content=_SYSTEM_PROMPT),
            *history,
            ChatMessage(
                role="user",
                content=(
                    f"CONTEXTO DO EDITAL:\n\n{context_block}\n\n"
                    f"PERGUNTA: {question}\n\n"
                    "Responda em português, citando as fontes como [N]."
                ),
            ),
        ]

        async for token in self._llm.stream(messages, temperature=self._temperature):
            yield TokenEvent(delta=token)
        yield DoneEvent()
