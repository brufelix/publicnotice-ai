# 📜 publicnotice-ai

> Assistente de IA para **editais de concursos públicos brasileiros**. Faça perguntas em linguagem natural e receba respostas com **citações ao trecho exato do PDF**.

[![CI API](https://github.com/brunodias/publicnotice-ai/actions/workflows/ci-api.yml/badge.svg)](https://github.com/brunodias/publicnotice-ai/actions/workflows/ci-api.yml)
[![CI Web](https://github.com/brunodias/publicnotice-ai/actions/workflows/ci-web.yml/badge.svg)](https://github.com/brunodias/publicnotice-ai/actions/workflows/ci-web.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ O que faz

Um sistema **RAG (Retrieval-Augmented Generation)** completo:

1. **Upload** de um edital em PDF (concurso público, vestibular, licitação)
2. O sistema **indexa** o documento (parse → chunking → embeddings → pgvector)
3. Você **conversa** com o edital em linguagem natural
4. Cada resposta vem com **citações clicáveis** apontando a página de origem

> **Roda 100% local** com Ollama (privacidade total) ou em **produção** com Groq/Gemini/OpenAI — graças à arquitetura hexagonal, é só trocar uma variável de ambiente.

---

## 🏗️ Arquitetura

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  Next.js (Web)  │ ───►  │  FastAPI (API)  │ ───►  │ Postgres+pgvector│
│  Vercel         │       │  Railway        │       │ Railway          │
└─────────────────┘       └────────┬────────┘       └──────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Ollama (dev)   │
                          │  Groq (prod)    │
                          └─────────────────┘
```

Ver [`docs/architecture.md`](docs/architecture.md) para diagrama detalhado e fluxo do RAG.

### Princípios

- **Hexagonal / Ports & Adapters** — LLM, embeddings, vector store e parser são `Protocol`s trocáveis
- **Camadas:** `api → services → domain` (domain puro, sem I/O)
- **Evals como first-class:** [`tests/evals/`](apps/api/tests/evals) mede qualidade do RAG (RAGAS)
- **12-factor app** — config via `.env`, logs estruturados em stdout
- **ADRs** documentando cada decisão técnica em [`docs/adr/`](docs/adr/)

---

## 🧰 Stack

### Backend (`apps/api/`)
- **Python 3.12** + **FastAPI** + **uv**
- **SQLAlchemy 2.0 async** + **Alembic** + **pgvector**
- **PyMuPDF** (parsing) + **structlog** (logs)
- **pytest** + **testcontainers** + **RAGAS** (evals)
- **ruff** + **mypy**

### Frontend (`apps/web/`)
- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind v4** + **shadcn/ui**
- **TanStack Query** + **Vercel AI SDK** (streaming)
- **Biome** (lint + format)

### Infra
- **Docker Compose** (dev local: Postgres+pgvector + Ollama + API + Web)
- **Railway** (API + DB) + **Vercel** (Web) em produção
- **GitHub Actions** (CI por path filter)

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Docker + Docker Compose
- ~6 GB de RAM livre (pro Ollama)

### Setup
```bash
# 1. Clone e entre no diretório
git clone https://github.com/brunodias/publicnotice-ai.git
cd publicnotice-ai

# 2. Copie variáveis de ambiente
cp .env.example .env

# 3. Suba tudo (API, Web, Postgres, Ollama)
make up

# 4. Baixe os modelos do Ollama (~2 GB, primeira vez só)
make pull-models

# 5. Rode migrations e ingere PDFs de exemplo
make bootstrap

# 6. Abra o app
open http://localhost:3000
```

### Atalhos do Makefile
| Comando | O que faz |
|---|---|
| `make up` | Sobe todos os serviços (docker compose up -d) |
| `make down` | Derruba tudo |
| `make logs` | Mostra logs agregados |
| `make pull-models` | Baixa `llama3.2:3b` e `nomic-embed-text` |
| `make bootstrap` | Migrations + seed de PDFs de exemplo |
| `make seed` | Re-ingere PDFs de `data/sample/` |
| `make test` | Roda testes da API |
| `make lint` | Lint + format check |

---

## 📁 Estrutura

```
publicnotice-ai/
├── apps/
│   ├── api/        # Backend Python (FastAPI)
│   └── web/        # Frontend Next.js
├── data/sample/    # PDFs de editais reais (seed)
├── docs/
│   ├── architecture.md
│   └── adr/        # Architecture Decision Records
├── infra/docker/   # Dockerfiles
└── scripts/        # bootstrap.sh, pull-ollama-models.sh
```

Detalhes em [`docs/architecture.md`](docs/architecture.md).

---

## 🌐 Deploy

| Serviço | Plataforma | Root dir |
|---|---|---|
| API | Railway | `apps/api` |
| Postgres + pgvector | Railway (template) | — |
| Web | Vercel | `apps/web` |

Ver [`docs/adr/0005-deployment-strategy.md`](docs/adr/0005-deployment-strategy.md) (em breve).

---

## 📄 Licença

[MIT](LICENSE) © Bruno Dias
