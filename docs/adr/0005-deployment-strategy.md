# ADR 0005 — Estratégia de deploy: Railway + Vercel

- **Status:** aceito
- **Data:** 2026-05-01

## Contexto

Precisamos hospedar:
- API Python (FastAPI) com workloads ocasionais
- Postgres com extensão `pgvector`
- Frontend Next.js
- (Opcional) provider de LLM

Restrições: custo baixo, deploy automatizado via Git, fácil de demonstrar.

## Decisão

| Componente | Plataforma | Por quê |
|---|---|---|
| API + worker | **Railway** | Suporte a Dockerfile, autoscaling simples, deploy via GitHub, ~$5/mês |
| Postgres + pgvector | **Railway** (template oficial) | 1 clique, mesma rede privada da API |
| Frontend | **Vercel** | Tier hobby grátis, otimizações Next.js nativas |
| LLM (prod) | **Groq** + **Gemini** | Free tier generoso (ver ADR 0003) |

## Configuração

### Railway (API)
- Root Directory: `apps/api`
- Dockerfile: `infra/docker/api.Dockerfile` (declarado em `railway.json`)
- Healthcheck: `/health`
- Postgres template: marketplace "Postgres + pgvector"
- Variáveis: `DATABASE_URL` (auto), `LLM_PROVIDER=groq`, `GROQ_API_KEY`, etc.

### Vercel (Web)
- Root Directory: `apps/web`
- Framework: Next.js (auto)
- Variáveis: `NEXT_PUBLIC_API_URL=https://<api>.up.railway.app`

## Consequências

### Positivas
- Custo total estimado: **~$5–10/mês**
- `git push origin main` → deploy automático nos dois lados
- Zero configuração de infra recorrente
- Postgres + pgvector "just works" via template

### Negativas
- Lock-in moderado nas plataformas (mitigado: tudo containerizado e migrável)
- Ollama não roda bem na Railway (sem GPU + RAM cara)
  → mitigação: Ollama só em dev local; prod usa Groq via API

## Alternativas consideradas

- **Fly.io** — free tier mais generoso, mas DX um pouco pior; viável como backup
- **Render** — funciona, mas free tier dá sleep agressivo
- **AWS/GCP** — overkill e caro pra portfólio
