# publicnotice-api

Backend Python (FastAPI) do **publicnotice-ai**.

Ver [`../../README.md`](../../README.md) para visão geral do projeto.

## Comandos rápidos (a partir da raiz do monorepo)

```bash
make up           # sobe API + DB + Ollama
make migrate      # roda migrations
make seed         # ingere PDFs de data/sample/
make test         # pytest
make lint         # ruff + mypy
```

## Rodando standalone (sem Docker)

```bash
cd apps/api
uv sync
uv run uvicorn publicnotice.main:app --reload
```

A API sobe em http://localhost:8000 com docs em http://localhost:8000/docs.

## Estrutura

Ver [`../../docs/architecture.md`](../../docs/architecture.md).
