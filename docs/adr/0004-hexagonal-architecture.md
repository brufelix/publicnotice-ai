# ADR 0004 — Arquitetura hexagonal (Ports & Adapters)

- **Status:** aceito
- **Data:** 2026-05-01

## Contexto

O backend integra com vários serviços externos voláteis:
LLMs (Ollama, Groq, Gemini, OpenAI), embeddings, vector stores, parsers de
PDF. Cada um pode mudar conforme custo/qualidade evoluem.

Precisamos de uma estrutura que:
1. Permita trocar provider sem refatorar o domínio
2. Permita testar a lógica de negócio sem subir Ollama/Postgres
3. Deixe explícito o que é regra de negócio vs. detalhe técnico

## Decisão

Adotar **arquitetura hexagonal (Ports & Adapters)** com camadas:

```
api/         ← controllers HTTP (FastAPI) — finos
services/    ← casos de uso (orquestração)
domain/      ← entidades + regras puras (sem I/O)
adapters/    ← implementações de Protocols (ports)
  └── llm/, embeddings/, vectorstore/, pdf/, chunker/
infra/       ← detalhes técnicos (DB, logging, observability)
```

**Regras:**
1. `domain/` não importa nada de fora do próprio módulo
2. `services/` depende só de `domain/` e dos `Protocol`s em `adapters/*/base.py`
3. `adapters/<x>/base.py` define o **Protocol** (porta)
4. `adapters/<x>/<impl>.py` é a implementação concreta (adapter)
5. `api/deps.py` faz a injeção (escolhe a implementação por env var)

## Consequências

### Positivas
- Trocar Ollama → Groq = 1 linha em `deps.py`
- Testes unitários de `services/` usam fakes de `tests/fakes/`, sem I/O
- Domínio testável de forma trivial
- Onboarding fácil: leitor entende camada por camada

### Negativas
- Mais arquivos do que uma estrutura "flat"
- Pequeno overhead de boilerplate nos `Protocol`s
  → aceitável dado o ganho de testabilidade e flexibilidade

## Exemplo concreto

```python
# adapters/llm/base.py
class LLMClient(Protocol):
    async def generate(self, system: str, user: str) -> AsyncIterator[str]: ...

# adapters/llm/ollama.py
class OllamaLLM:
    async def generate(self, system, user) -> AsyncIterator[str]:
        # chama ollama via httpx, faz streaming
        ...

# api/deps.py
def get_llm() -> LLMClient:
    match settings.llm_provider:
        case "ollama": return OllamaLLM(settings.ollama_base_url)
        case "groq":   return GroqLLM(settings.groq_api_key)
        ...

# services/chat.py
class ChatService:
    def __init__(self, llm: LLMClient, retrieval: RetrievalService): ...
```
