"""Application configuration via environment variables.

All settings are loaded from environment variables (or a `.env` file in dev).
Strictly typed via Pydantic so misconfiguration fails fast at startup.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

LLMProvider = Literal["ollama", "groq", "gemini", "openai"]
EmbeddingProvider = Literal["ollama", "gemini", "openai"]


class Settings(BaseSettings):
    """Strongly-typed application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ──────────────────────────────────────────────────
    app_env: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"

    # ─── API ──────────────────────────────────────────────────
    api_host: str = "0.0.0.0"  # noqa: S104 — bind all in container
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # ─── Database ─────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/publicnotice",
        description="SQLAlchemy async DSN. Railway injects this in production.",
    )

    # ─── LLM ──────────────────────────────────────────────────
    llm_provider: LLMProvider = "ollama"
    llm_model: str = "llama3.2:3b"

    ollama_base_url: str = "http://localhost:11434"

    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # ─── Embeddings ───────────────────────────────────────────
    embedding_provider: EmbeddingProvider = "ollama"
    embedding_model: str = "nomic-embed-text"
    embedding_dimensions: int = 768

    # ─── Storage ──────────────────────────────────────────────
    storage_path: str = "./storage"

    # ─── Rate limiting (slowapi) ──────────────────────────────
    rate_limit_enabled: bool = True
    rate_limit_upload: str = "10/minute"
    rate_limit_chat: str = "30/minute"

    # ─── Helpers ──────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse `CORS_ORIGINS` (comma-separated) into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor (single instance per process)."""
    return Settings()
