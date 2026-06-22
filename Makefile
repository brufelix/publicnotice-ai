# publicnotice-ai · atalhos de desenvolvimento
.DEFAULT_GOAL := help
SHELL := /bin/bash

COMPOSE := docker compose

# ─── Help ────────────────────────────────────────────────────
.PHONY: help
help: ## Mostra esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Setup ───────────────────────────────────────────────────
.PHONY: env
env: ## Cria .env a partir do .env.example (se não existir)
	@test -f .env || cp .env.example .env && echo "✅ .env criado"

.PHONY: bootstrap
bootstrap: env up pull-models migrate seed ## Setup completo (primeira execução)
	@echo "✅ Bootstrap concluído. Acesse http://localhost:3000"

# ─── Docker ──────────────────────────────────────────────────
.PHONY: up
up: ## Sobe todos os serviços
	$(COMPOSE) up -d

.PHONY: down
down: ## Derruba todos os serviços
	$(COMPOSE) down

.PHONY: restart
restart: down up ## Reinicia os serviços

.PHONY: logs
logs: ## Mostra logs agregados (Ctrl+C para sair)
	$(COMPOSE) logs -f --tail=100

.PHONY: ps
ps: ## Lista status dos serviços
	$(COMPOSE) ps

# ─── Ollama ──────────────────────────────────────────────────
.PHONY: pull-models
pull-models: ## Baixa modelos LLM e embeddings no Ollama
	./scripts/pull-ollama-models.sh

# ─── Banco de dados ──────────────────────────────────────────
.PHONY: migrate
migrate: ## Roda migrations (Alembic)
	$(COMPOSE) exec api alembic upgrade head

.PHONY: migration
migration: ## Cria nova migration (ex: make migration name=add_x)
	$(COMPOSE) exec api alembic revision --autogenerate -m "$(name)"

.PHONY: seed
seed: ## Ingere PDFs de data/sample/
	$(COMPOSE) exec api python scripts/seed.py

.PHONY: psql
psql: ## Abre shell no Postgres
	$(COMPOSE) exec postgres psql -U postgres -d publicnotice

# ─── Backend ─────────────────────────────────────────────────
.PHONY: api-shell
api-shell: ## Shell na API
	$(COMPOSE) exec api bash

.PHONY: test
test: ## Roda testes da API
	$(COMPOSE) exec api uv run pytest

.PHONY: lint
lint: ## Lint + format check (API + Web)
	$(COMPOSE) exec api uv run ruff check .
	$(COMPOSE) exec api uv run mypy src
	cd apps/web && pnpm biome check .

.PHONY: format
format: ## Auto-formata código (API + Web)
	$(COMPOSE) exec api uv run ruff format .
	$(COMPOSE) exec api uv run ruff check . --fix
	cd apps/web && pnpm biome check . --write

# ─── Cleanup ─────────────────────────────────────────────────
.PHONY: clean
clean: ## Remove containers e volumes (CUIDADO: apaga DB e modelos)
	$(COMPOSE) down -v
