"""Map domain exceptions to HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from publicnotice.domain.exceptions import (
    DomainError,
    ExternalServiceError,
    NotFoundError,
    ValidationError,
)
from publicnotice.infra.logging import get_logger

log = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Wire up handlers translating domain errors into HTTP responses."""

    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(ValidationError)
    async def _validation(_: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(ExternalServiceError)
    async def _external(_: Request, exc: ExternalServiceError) -> JSONResponse:
        log.error("external_service_error", error=str(exc))
        return JSONResponse(status_code=502, content={"detail": "Upstream service error"})

    @app.exception_handler(DomainError)
    async def _domain(_: Request, exc: DomainError) -> JSONResponse:
        log.error("domain_error", error=str(exc))
        return JSONResponse(status_code=400, content={"detail": str(exc)})
