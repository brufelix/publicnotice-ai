"""OpenAI embeddings adapter (also works for any OpenAI-compatible API)."""

from __future__ import annotations

from collections.abc import Sequence

from openai import AsyncOpenAI, OpenAIError

from publicnotice.domain.exceptions import ExternalServiceError


class OpenAIEmbeddings:
    """Embeddings via OpenAI (e.g. `text-embedding-3-small` → 1536d)."""

    def __init__(
        self,
        api_key: str,
        model: str,
        dimensions: int,
        base_url: str | None = None,
    ) -> None:
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._model = model
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        return self._dimensions

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            resp = await self._client.embeddings.create(model=self._model, input=list(texts))
        except OpenAIError as exc:
            raise ExternalServiceError(f"OpenAI embeddings failed: {exc}") from exc
        return [item.embedding for item in resp.data]
