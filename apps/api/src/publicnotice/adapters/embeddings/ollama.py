"""Ollama embeddings adapter (uses the native /api/embed endpoint)."""

from __future__ import annotations

from collections.abc import Sequence

import httpx

from publicnotice.domain.exceptions import ExternalServiceError


class OllamaEmbeddings:
    """Embeddings via Ollama's REST API (e.g. `nomic-embed-text` → 768d)."""

    def __init__(
        self,
        base_url: str,
        model: str,
        dimensions: int,
        timeout: float = 60.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._dimensions = dimensions
        self._timeout = timeout

    @property
    def dimensions(self) -> int:
        return self._dimensions

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        payload = {"model": self._model, "input": list(texts)}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(f"{self._base_url}/api/embed", json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as exc:
            raise ExternalServiceError(f"Ollama embeddings failed: {exc}") from exc

        embeddings = data.get("embeddings")
        if not isinstance(embeddings, list) or len(embeddings) != len(texts):
            raise ExternalServiceError("Ollama embeddings: malformed response")
        return embeddings
