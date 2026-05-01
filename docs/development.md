# 🛠️ Guia de desenvolvimento

## Pré-requisitos

- **Docker Desktop** (ou Docker Engine + Compose)
- **~6 GB de RAM livre** para o Ollama rodar `llama3.2:3b`
- (Opcional, para rodar sem Docker) **Python 3.12+** com [uv](https://docs.astral.sh/uv/) e **Node 22+** com pnpm

## Setup rápido

```bash
git clone https://github.com/brunodias/publicnotice-ai.git
cd publicnotice-ai
make bootstrap            # cria .env, sobe tudo, baixa modelos, migra, semeia
```

## Workflow do dia a dia

```bash
make up       # subir
make logs     # ver logs (Ctrl+C sai sem derrubar)
make test     # rodar testes
make lint     # ruff + mypy + biome
make down     # derrubar
```

## Rodando API standalone (debug)

```bash
cd apps/api
uv sync
uv run uvicorn publicnotice.main:app --reload
```

## Rodando Web standalone

```bash
cd apps/web
pnpm install
pnpm dev
```

## Variáveis de ambiente

Veja [`../.env.example`](../.env.example) — está totalmente comentado.

## Trocar provider de LLM (Ollama → Groq)

```bash
# .env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

Reinicie a API: `make restart`. Não precisa mudar código.

## Adicionar uma migration

```bash
make migration name=add_messages_table
make migrate
```

## Ingerir um PDF próprio

Coloque o arquivo em `data/sample/` e rode `make seed`, ou use o endpoint
`POST /api/v1/documents` (multipart/form-data) via Swagger em http://localhost:8000/docs.
