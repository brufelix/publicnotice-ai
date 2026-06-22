import type { DocumentResponse } from "../types";

/** Documentos pré-carregados para demo sem backend. */
export const SEED_DOCUMENTS: DocumentResponse[] = [
  {
    id: "demo-edital-ibge",
    filename: "edital-ibge-2024.pdf",
    pages: 42,
    status: "indexed",
    error_message: null,
    created_at: "2024-03-15T10:00:00.000Z",
  },
  {
    id: "demo-relatorio-interno",
    filename: "relatorio-auditoria-q1.pdf",
    pages: 18,
    status: "indexed",
    error_message: null,
    created_at: "2024-05-02T14:30:00.000Z",
  },
];
