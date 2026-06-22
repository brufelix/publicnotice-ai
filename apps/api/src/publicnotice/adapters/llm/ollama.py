"""Ollama LLM adapter (native /api/chat streaming)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator, Sequence

import httpx

from publicnotice.adapters.llm.base import ChatMessage
from publicnotice.domain.exceptions import ExternalServiceError


class OllamaLLM:
    """Streams chat completions from a local Ollama server."""

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 300.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout

    async def stream(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        payload: dict[str, object] = {
            "model": self._model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": True,
            "options": {"temperature": temperature},
        }
        if max_tokens is not None:
            # Ollama uses `num_predict` for generation length
            payload["options"] = {**payload["options"], "num_predict": max_tokens}  # type: ignore[dict-item]

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream(
                    "POST", f"{self._base_url}/api/chat", json=payload
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            event = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if event.get("done"):
                            return
                        message = event.get("message") or {}
                        token = message.get("content") or ""
                        if token:
                            yield token
        except httpx.HTTPError as exc:
            raise ExternalServiceError(f"Ollama chat failed: {exc}") from exc
