# 📄 PDFs de exemplo

Esta pasta guarda PDFs de editais reais para o **seed** do projeto
(`make seed` ingere todos eles automaticamente).

## Status

⚠️ **Pendente** — nenhum PDF adicionado ainda. Sugestões para incluir:

| Edital | Fonte | Por quê |
|---|---|---|
| Receita Federal (Auditor-Fiscal) | site Cebraspe | Edital denso, ótimo para testar chunking |
| Polícia Federal (Agente) | site Cebraspe | Estrutura clara, muitas seções |
| Banco Central (Analista) | site Cesgranrio | Tópicos variados |
| Concurso municipal qualquer | site da prefeitura | Testa robustez (PDFs "ruins") |

## Como adicionar

1. Baixe os PDFs e coloque nesta pasta com nomes em `kebab-case`:
   ```
   data/sample/
   ├── receita-federal-2024.pdf
   ├── policia-federal-2024.pdf
   └── bacen-2024.pdf
   ```
2. **Não comite arquivos com mais de 5MB sem usar Git LFS.**
3. Ajuste `apps/api/scripts/seed.py` se quiser metadados customizados.

## Licença / direitos autorais

Editais públicos brasileiros são de domínio público (Lei 9.610/98, art. 8º, IV).
Pode versionar livremente. Mantenha a fonte/URL original neste README quando
adicionar.
