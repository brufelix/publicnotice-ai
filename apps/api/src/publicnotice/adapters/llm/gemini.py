"""Google Gemini LLM adapter."""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence

from publicnotice.adapters.llm.base import ChatMessage
from publicnotice.domain.exceptions import ExternalServiceError


class GeminiLLM:
    """Streams chat completions from Google Gemini via google-genai."""

    def __init__(self, api_key: str, model: str) -> None:
        # Imported lazily so the SDK isn't required when not in use
        from google import genai  # type: ignore[import-not-found]

        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def stream(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        from google.genai import types  # type: ignore[import-not-found]

        # Gemini takes a single system instruction + alternating user/model turns.
        system_text = "\n\n".join(m.content for m in messages if m.role == "system") or None
        contents: list[types.Content] = []
        for m in messages:
            if m.role == "system":
                continue
            role = "model" if m.role == "assistant" else "user"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(m.content)])
            )

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_text,
        )

        try:
            stream = await self._client.aio.models.generate_content_stream(
                model=self._model,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                token = getattr(chunk, "text", "") or ""
                if token:
                    yield token
        except Exception as exc:  # google-genai raises a wide range of errors
            raise ExternalServiceError(f"Gemini chat failed: {exc}") from exc
