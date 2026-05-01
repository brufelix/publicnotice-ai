-- ─────────────────────────────────────────────────────────────
-- publicnotice-ai · Postgres init script (DEV LOCAL)
-- ─────────────────────────────────────────────────────────────
-- Em produção (Railway), use o template "Postgres + pgvector"
-- ou rode CREATE EXTENSION via migration do Alembic.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
