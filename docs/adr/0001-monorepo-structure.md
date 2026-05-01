# ADR 0001 — Estrutura monorepo

- **Status:** aceito
- **Data:** 2026-05-01
- **Decisor:** Bruno Dias

## Contexto

Precisamos hospedar dois aplicativos relacionados:
- `apps/api` — FastAPI (Python)
- `apps/web` — Next.js (TypeScript)

Eles compartilham contratos (tipos da API), configuração de ambiente e infra
local (Docker Compose). As opções consideradas foram:

1. **Monorepo simples** (1 repo, sem ferramentas tipo Nx/Turborepo)
2. **Monorepo com ferramenta** (Nx, Turborepo, Moon)
3. **Polyrepo** (2 ou 3 repos separados)

## Decisão

Usar **monorepo simples**, com pastas `apps/api` e `apps/web` na raiz, sem
ferramentas de orquestração de monorepo. Coordenação se dá via:

- `Makefile` na raiz com atalhos de alto nível
- `docker-compose.yml` único para dev local
- GitHub Actions com **path filters** (CI por app)
- Deploys independentes (Railway aponta `apps/api`, Vercel aponta `apps/web`)

## Consequências

### Positivas
- 1 link no portfólio cobre o projeto inteiro (README + issues + stars unificados)
- Mudanças coordenadas (API + Web) viram 1 PR só
- Setup local trivial (`git clone` + `docker compose up`)
- Sem complexidade adicional de Nx/Turborepo (overkill para 2 apps)

### Negativas
- Plataformas de deploy precisam de "Root Directory" configurado
  → mitigação: **Railway e Vercel suportam isso nativamente**
- CI precisa de path filter para não rodar tudo a cada commit
  → mitigação: workflows separados (`ci-api.yml` / `ci-web.yml`) com `paths:`

## Alternativas descartadas

- **Turborepo / Nx:** trazem cache remoto e task pipelines, mas o projeto
  só tem 2 apps sem código compartilhado em TS — overhead não compensa.
- **Polyrepo:** pulveriza visibilidade no GitHub, atrapalha o objetivo de
  portfólio (mostrar o sistema como um todo).
