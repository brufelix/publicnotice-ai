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

_SYSTEM_PROMPT = """Você é um assistente que responde perguntas sobre documentos em PDF.

Os documentos podem ser editais de concursos públicos, relatórios internos, especificações técnicas ou outros textos. Use somente os trechos fornecidos no contexto — não invente informação.

REGRAS:
1. Responda APENAS com base nos trechos numerados do contexto ([1], [2], …).
2. Cite a fonte com os mesmos colchetes do contexto, ex.: [1], [2].
3. Se o contexto contiver um campo ou rótulo explícito (ex.: "Origem:", "Data:", "Escopo:", "Status:"), use esse valor quando a pergunta for sobre o mesmo assunto — mesmo que a pergunta use palavras diferentes (ex.: "origem do arquivo" ↔ "Origem:").
4. Só diga "Não encontrei essa informação no documento." quando o contexto realmente não contiver dados suficientes para responder.
5. Seja objetivo, preciso e responda em português.
6. Quando relevante, indique a página de onde veio a informação.
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
_MAX_CHUNK_CHARS_IN_PROMPT = 1200


def _build_context_block(chunks: Sequence[RetrievedChunk]) -> str:
    lines = []
    for i, rc in enumerate(chunks, start=1):
        content = rc.chunk.content[:_MAX_CHUNK_CHARS_IN_PROMPT]
        lines.append(f"[{i}] (página {rc.chunk.page})\n{content}")
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
    """Grounded chat over indexed documents."""

    def __init__(
        self,
        retrieval: RetrievalService,
        llm: LLMProvider,
        *,
        top_k: int = 3,
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
                "Não encontrei nenhum trecho relevante no documento para responder a essa pergunta."
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
                    f"CONTEXTO DO DOCUMENTO:\n\n{context_block}\n\n"
                    f"PERGUNTA: {question}\n\n"
                    "Responda em português com base exclusiva no contexto acima, citando as fontes como [N]."
                ),
            ),
        ]

        async for token in self._llm.stream(messages, temperature=self._temperature):
            yield TokenEvent(delta=token)
        yield DoneEvent()
