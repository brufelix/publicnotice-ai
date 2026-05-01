# ADR 0003 — Ollama (dev) + Groq/Gemini (prod) como providers de LLM

- **Status:** aceito
- **Data:** 2026-05-01

## Contexto

Precisamos de um provider de LLM e de embeddings. Restrições:

- **Custo:** projeto de portfólio precisa ser barato/grátis
- **Privacidade:** demo deve poder rodar 100% local
- **Qualidade:** respostas em produção precisam ser razoáveis e rápidas
- **Hospedagem:** API roda na Railway, sem GPU disponível

## Decisão

**Estratégia híbrida por ambiente:**

| Ambiente | LLM | Embeddings |
|---|---|---|
| **Dev local** | Ollama `llama3.2:3b` | Ollama `nomic-embed-text` |
| **Produção** | Groq `llama-3.3-70b-versatile` | Gemini `text-embedding-004` |

Toda a escolha é controlada por env var (`LLM_PROVIDER`, `EMBEDDING_PROVIDER`)
graças à arquitetura hexagonal — adapters implementam `Protocol`s comuns.

## Razões

### Por que Ollama em dev
- 100% offline, custo zero
- Storytelling forte no README ("rode privado, sem mandar dados pra cloud")
- Não precisa cadastrar API key pra contribuidores rodarem o projeto

### Por que NÃO Ollama em prod (Railway)
- Sem GPU → respostas lentas (5-30s)
- RAM consome ~3GB constantes → caro 24/7
- Pull do modelo no boot é lento

### Por que Groq em prod
- Free tier generoso (14.4k req/dia)
- Latência absurdamente baixa (<1s pra 70B)
- API compatível com OpenAI SDK → adapter trivial

### Por que Gemini para embeddings em prod
- Free tier para `text-embedding-004`
- Boa qualidade (768 dim, mesma do nomic-embed-text → não precisa reindexar)

## Consequências

- 4 adapters de LLM: `ollama.py`, `groq.py`, `gemini.py`, `openai.py`
- 3 adapters de embeddings: `ollama.py`, `gemini.py`, `openai.py`
- Cuidado com **dimensão dos embeddings**: precisa ser consistente entre
  ingestão e consulta. Documentar bem em `EMBEDDING_DIMENSIONS`.
- Migrar dimensão de embedding em prod requer reindexação completa.
