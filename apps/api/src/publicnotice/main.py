"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from publicnotice import __version__
from publicnotice.api.errors import register_exception_handlers
from publicnotice.api.v1 import router as v1_router
from publicnotice.config import get_settings
from publicnotice.infra.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Application startup/shutdown hooks."""
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.is_production)
    log = get_logger("publicnotice")
    log.info(
        "app_starting",
        env=settings.app_env,
        version=__version__,
        llm_provider=settings.llm_provider,
        embedding_provider=settings.embedding_provider,
    )
    yield
    log.info("app_stopping")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="publicnotice-ai",
        description="RAG API for Brazilian public notices (editais).",
        version=__version__,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    # v1 routes (includes /api/v1/health)
    app.include_router(v1_router)

    # Top-level liveness for load balancers (Railway healthcheck = /health)
    from publicnotice.api.v1.health import router as health_router

    app.include_router(health_router)

    return app


app = create_app()
