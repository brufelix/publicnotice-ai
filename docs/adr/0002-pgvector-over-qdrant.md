# ADR 0002 — pgvector (Postgres) como vector store

- **Status:** aceito
- **Data:** 2026-05-01

## Contexto

RAG precisa de uma vector store para indexar embeddings dos chunks dos
PDFs e fazer busca por similaridade (top-K). Opções consideradas:

| Opção | Prós | Contras |
|---|---|---|
| **pgvector** | 1 banco só, SQL familiar, transações ACID com metadados, joins | Performance abaixo de Qdrant em datasets gigantes (>10M vetores) |
| **Qdrant** | Excelente performance, filtros ricos | Mais um serviço pra operar |
| **Chroma** | Simples, embarcável | Menos maduro pra produção |
| **Pinecone** | Gerenciado | Custo + lock-in + sem free tier real |

## Decisão

Usar **pgvector** sobre Postgres 16, com índice **HNSW**.

## Razões

1. **Operacional:** Railway oferece template "Postgres + pgvector" com 1 clique
2. **Simplicidade:** mesmo banco guarda metadados (`documents`, `chunks`) e vetores
3. **Performance suficiente:** projetos de portfólio raramente passam de 100k chunks
4. **Custo zero adicional:** um único serviço pago no Railway
5. **Padrão de mercado:** Supabase, Neon, AWS RDS — todos suportam nativamente

## Consequências

- Toda a persistência (relacional + vetorial) fica em uma migration Alembic
- Adapter `adapters/vectorstore/pgvector.py` implementa o `Protocol`
- Trocar para Qdrant no futuro = só nova implementação do mesmo `Protocol`
