#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# publicnotice-ai · baixa modelos LLM e embeddings no Ollama
# ─────────────────────────────────────────────────────────────
set -euo pipefail

LLM_MODEL="${LLM_MODEL:-llama3.2:3b}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-nomic-embed-text}"
CONTAINER="${OLLAMA_CONTAINER:-publicnotice-ollama}"

echo "📦 Baixando modelos no container '$CONTAINER'..."
echo "   • LLM:        $LLM_MODEL"
echo "   • Embeddings: $EMBEDDING_MODEL"
echo ""

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Container '$CONTAINER' não está rodando. Rode 'make up' primeiro."
  exit 1
fi

docker exec "$CONTAINER" ollama pull "$LLM_MODEL"
docker exec "$CONTAINER" ollama pull "$EMBEDDING_MODEL"

echo ""
echo "✅ Modelos prontos."
docker exec "$CONTAINER" ollama list
