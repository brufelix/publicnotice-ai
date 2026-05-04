"""OpenAI-compatible LLM adapter (works with OpenAI, Groq, and similar APIs)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence

from openai import AsyncOpenAI, OpenAIError

from publicnotice.adapters.llm.base import ChatMessage
from publicnotice.domain.exceptions import ExternalServiceError


class OpenAICompatibleLLM:
    """Streams chat completions via the OpenAI Python SDK.

    Set `base_url` to use it against Groq (``https://api.groq.com/openai/v1``)
    or any other OpenAI-compatible provider.
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
    ) -> None:
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._model = model

    async def stream(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        try:
            stream = await self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": m.role, "content": m.content} for m in messages],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                token = (getattr(delta, "content", None) or "") if delta else ""
                if token:
                    yield token
        except OpenAIError as exc:
            raise ExternalServiceError(f"OpenAI-compatible chat failed: {exc}") from exc
