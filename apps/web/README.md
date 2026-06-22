# publicnotice-web

Frontend Next.js 15 (App Router) do **publicnotice-ai**.

Ver [`../../README.md`](../../README.md) para visão geral.

## Deploy (Vercel)

1. Importar o repositório em [vercel.com/new](https://vercel.com/new)
2. Root Directory: `apps/web`
3. Definir `NEXT_PUBLIC_API_URL` apontando para a API (Railway)

```bash
cp .env.example .env.local
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
