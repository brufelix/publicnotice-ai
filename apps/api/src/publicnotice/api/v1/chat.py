"""Chat API — RAG over indexed editais, streamed via Server-Sent Events.

Event types pushed to the client:
- ``citations``: JSON list of citations (emitted once at the start)
- ``token``: a text delta to append to the assistant message
- ``done``: terminal marker (clients should close the stream)
- ``error``: emitted if the LLM/embeddings provider fails mid-stream
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from starlette.responses import Response

from publicnotice.adapters.llm.base import ChatMessage
from publicnotice.api.deps import ChatServiceDep
from publicnotice.api.rate_limit import limiter
from publicnotice.config import get_settings
from publicnotice.domain.exceptions import ExternalServiceError
from publicnotice.infra.logging import get_logger
from publicnotice.services.chat import (
    CitationsEvent,
    DoneEvent,
    TokenEvent,
)

router = APIRouter(prefix="/chat", tags=["chat"])
log = get_logger(__name__)
_CHAT_RATE_LIMIT = get_settings().rate_limit_chat


class HistoryMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    document_id: UUID | None = None
    history: list[HistoryMessage] = Field(default_factory=list, max_length=20)
    top_k: int = Field(default=5, ge=1, le=20)


def _serialize_citations(event: CitationsEvent) -> str:
    return json.dumps(
        {
            "citations": [
                {
                    "index": c.index,
                    "chunk_id": str(c.chunk_id),
                    "document_id": str(c.document_id),
                    "page": c.page,
                    "snippet": c.snippet,
                    "score": round(c.score, 4),
                }
                for c in event.citations
            ]
        },
        ensure_ascii=False,
    )


@router.post("", summary="Stream a grounded answer over indexed editais (SSE)")
@limiter.limit(_CHAT_RATE_LIMIT)
async def chat(
    request: Request,
    response: Response,
    payload: ChatRequest,
    service: ChatServiceDep,
) -> EventSourceResponse:
    history = [ChatMessage(role=m.role, content=m.content) for m in payload.history]  # type: ignore[arg-type]
    # `top_k` is per-request: rebuild a service variant only if it differs from default.
    if payload.top_k != service._top_k:  # noqa: SLF001 — internal knob
        service = service.__class__(
            retrieval=service._retrieval,  # noqa: SLF001
            llm=service._llm,  # noqa: SLF001
            top_k=payload.top_k,
            temperature=service._temperature,  # noqa: SLF001
        )

    async def event_stream() -> AsyncIterator[dict[str, str]]:
        try:
            async for event in service.stream(
                payload.question,
                document_id=payload.document_id,
                history=history,
            ):
                if isinstance(event, CitationsEvent):
                    yield {"event": "citations", "data": _serialize_citations(event)}
                elif isinstance(event, TokenEvent):
                    yield {"event": "token", "data": event.delta}
                elif isinstance(event, DoneEvent):
                    yield {"event": "done", "data": ""}
        except ExternalServiceError as exc:
            log.error("chat_external_error", error=str(exc))
            yield {"event": "error", "data": "upstream_provider_error"}
        except Exception as exc:  # noqa: BLE001
            log.error("chat_failed", error=str(exc))
            yield {"event": "error", "data": "internal_error"}

    return EventSourceResponse(event_stream())
