"""Rate limiting via `slowapi` (sliding-window in-memory).

- Singleton ``limiter`` is wired by ``main.create_app()``.
- Disabled when ``settings.rate_limit_enabled`` is False (default in tests).
- Rate strings are read from ``Settings`` so ops can tune via env vars.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from publicnotice.config import get_settings

_settings = get_settings()


def _key_func(request):  # type: ignore[no-untyped-def]
    # Behind a proxy (Railway/Vercel) prefer the forwarded client IP.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_key_func,
    enabled=_settings.rate_limit_enabled,
    default_limits=[],
    headers_enabled=True,
)
