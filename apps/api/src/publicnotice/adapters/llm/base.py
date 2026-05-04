"""LLM port (chat completions with streaming)."""

from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

Role = Literal["system", "user", "assistant"]


@dataclass(slots=True, frozen=True)
class ChatMessage:
    role: Role
    content: str


class LLMProvider(Protocol):
    """Port: stream a chat completion."""

    async def stream(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Yield response tokens (text deltas) as they arrive."""
        ...
