# publicnotice-web

Frontend Next.js 15 (App Router) do **publicnotice-ai**.

Ver [`../../README.md`](../../README.md) para visão geral.

## Deploy (Vercel)

### Sem backend (modo demonstração)

Enquanto a API não estiver no ar, use mocks no browser:

1. Importar o repositório em [vercel.com/new](https://vercel.com/new)
2. Root Directory: `apps/web`
3. Variável de ambiente: `NEXT_PUBLIC_USE_MOCK_API=true`
4. Deploy — o app já vem com PDFs de exemplo e chat simulado (SSE)

### Com backend (produção)

1. Root Directory: `apps/web`
2. `NEXT_PUBLIC_USE_MOCK_API=false` (ou omitir)
3. `NEXT_PUBLIC_API_URL` apontando para a API (Railway)

```bash
cp .env.example .env.local
# Demo local sem API:
# NEXT_PUBLIC_USE_MOCK_API=true
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm lint
```

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind v4 + shadcn/ui
- TanStack Query + Vercel AI SDK (streaming)
- Biome (lint + format)
