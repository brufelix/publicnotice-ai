"""Health and readiness endpoints.

- `/health`  → liveness  (process is up)
- `/ready`   → readiness (DB reachable)
"""

from fastapi import APIRouter, status
from pydantic import BaseModel

from publicnotice import __version__
from publicnotice.config import get_settings
from publicnotice.infra import db

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class ReadyResponse(BaseModel):
    status: str
    database: bool


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe — does NOT touch external dependencies."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=__version__,
        environment=settings.app_env,
    )


@router.get(
    "/ready",
    response_model=ReadyResponse,
    responses={503: {"description": "Database unreachable"}},
)
async def ready() -> ReadyResponse:
    """Readiness probe — verifies the DB is reachable."""
    try:
        await db.ping()
    except Exception:  # noqa: BLE001 — readiness fails on any DB error
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unavailable", "database": False},
        ) from None

    return ReadyResponse(status="ok", database=True)
