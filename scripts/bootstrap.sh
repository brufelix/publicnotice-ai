#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# publicnotice-ai · setup completo (primeira execução)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🚀 publicnotice-ai · bootstrap"
echo ""

# 1. .env
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "✅ .env criado a partir do .env.example"
else
  echo "ℹ️  .env já existe — pulando"
fi

# 2. Sobe serviços
echo ""
echo "🐳 Subindo serviços..."
docker compose up -d

# 3. Aguarda Postgres ficar pronto
echo ""
echo "⏳ Aguardando Postgres..."
until docker compose exec -T postgres pg_isready -U postgres -d publicnotice >/dev/null 2>&1; do
  sleep 1
done
echo "✅ Postgres pronto"

# 4. Baixa modelos do Ollama
echo ""
./scripts/pull-ollama-models.sh

# 5. Migrations + seed (descomente quando a Fase 2/3 estiver pronta)
# echo ""
# echo "🗄️  Rodando migrations..."
# docker compose exec -T api uv run alembic upgrade head
#
# echo ""
# echo "🌱 Ingerindo PDFs de exemplo..."
# docker compose exec -T api uv run python scripts/seed.py

echo ""
echo "✅ Bootstrap concluído!"
echo "   • API: http://localhost:8000/docs"
echo "   • Web: http://localhost:3000"
