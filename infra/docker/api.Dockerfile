# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# publicnotice-ai · API (FastAPI + Python 3.12 + uv)
# ─────────────────────────────────────────────────────────────

# ─── Stage 1: builder ───────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

# uv (gerenciador de pacotes Python, padrão de mercado em 2026)
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /bin/

WORKDIR /app

# Instala deps primeiro (cache) — copia só os manifestos
COPY apps/api/pyproject.toml apps/api/uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev || \
    uv sync --no-install-project --no-dev

# Copia o código e instala o projeto
COPY apps/api/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev

# ─── Stage 2: runtime ───────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Dependências de sistema mínimas (PyMuPDF precisa de libs C)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Usuário não-root
RUN groupadd --system app && useradd --system --gid app --home /app app

WORKDIR /app

COPY --from=builder --chown=app:app /app /app

USER app

EXPOSE 8000

CMD ["uvicorn", "publicnotice.main:app", "--host", "0.0.0.0", "--port", "8000"]
