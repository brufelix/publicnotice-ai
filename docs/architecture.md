# 🏗️ Arquitetura — publicnotice-ai

## Visão geral

```
┌──────────────────┐      HTTPS      ┌────────────────────┐    asyncpg    ┌──────────────────────┐
│  Next.js (Web)   │ ──────────────► │  FastAPI (API)     │ ────────────► │  Postgres + pgvector │
│  Vercel          │   SSE stream    │  Railway           │               │  Railway             │
└──────────────────┘                 └─────────┬──────────┘               └──────────────────────┘
                                               │
                                               │ HTTP/REST
                                               ▼
                                     ┌──────────────────────┐
                                     │  LLM provider        │
                                     │  • Ollama  (dev)     │
                                     │  • Groq    (prod)    │
                                     │  • Gemini / OpenAI   │
                                     └──────────────────────┘
```

---

## Fluxo do RAG

### Fase 1 · Ingestão (assíncrona, ao subir um PDF)

```
PDF
 │
 ▼
[ adapters/pdf/pymupdf ]      → texto + metadados (página, posição)
 │
 ▼
[ adapters/chunker/recursive ]→ chunks de ~500 tokens com overlap
 │
 ▼
[ adapters/embeddings/* ]     → vetores (768 ou 1536 dim)
 │
 ▼
[ adapters/vectorstore/pgvector ] → tabela `chunks` (text + embedding + metadata)
```

### Fase 2 · Consulta (síncrona, ao usuário enviar mensagem)

```
Pergunta do usuário
 │
 ▼
[ adapters/embeddings/* ]     → embedding da pergunta
 │
 ▼
[ services/retrieval ]        → top-K chunks via similaridade cosseno (pgvector)
 │
 ▼
[ services/chat ]             → monta prompt: system + chunks + pergunta
 │
 ▼
[ adapters/llm/* ]            → resposta em streaming (SSE)
 │
 ▼
Resposta + citações (chunks usados) → frontend
```

---

## Camadas (Clean / Hexagonal)

```
┌─────────────────────────────────────────────────────────────────┐
│  api/v1/*.py            ← HTTP, validação Pydantic, FastAPI      │
│         ↓ injeta via deps.py                                     │
│  services/*.py          ← casos de uso (orquestração pura)       │
│         ↓ depende de Protocol                                    │
│  adapters/<x>/base.py   ← interface (porta)                      │
│         ↑ implementa                                             │
│  adapters/<x>/<impl>.py ← detalhe técnico (Ollama, OpenAI, ...)  │
│                                                                   │
│  domain/*.py            ← entidades puras (sem dependências)     │
│  infra/*                ← DB, logging, observability             │
└─────────────────────────────────────────────────────────────────┘
```

**Regras:**
- `domain/` não importa **nada** de fora
- `services/` depende só de `domain/` + `Protocol`s de `adapters/`
- `api/` é fina: validação + chamada a service
- Trocar de Ollama → OpenAI = mudar 1 linha em `api/deps.py`

---

## Modelo de dados (resumo)

```
documents
├── id          UUID PK
├── filename    text
├── pages       int
├── status      text   (pending | indexed | failed)
└── created_at  timestamptz

chunks
├── id           UUID PK
├── document_id  UUID FK → documents
├── content      text
├── page         int
├── chunk_index  int
├── embedding    vector(768)     -- HNSW index
└── metadata     jsonb

messages   (futuro — Fase 6)
├── id              UUID PK
├── conversation_id UUID
├── role            text  (user | assistant)
├── content         text
├── citations       jsonb
└── created_at      timestamptz
```

---

## Decisões registradas

Ver [`adr/`](adr/) para o "porquê" de cada escolha técnica.
