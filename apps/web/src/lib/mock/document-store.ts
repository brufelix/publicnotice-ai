import type { DocumentResponse } from "../types";
import { SEED_DOCUMENTS } from "./seed";

const STORAGE_KEY = "publicnotice-mock-documents";

function read(): DocumentResponse[] {
  if (typeof window === "undefined") return [...SEED_DOCUMENTS];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED_DOCUMENTS];
    return JSON.parse(raw) as DocumentResponse[];
  } catch {
    return [...SEED_DOCUMENTS];
  }
}

function write(docs: DocumentResponse[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function listMockDocuments(): DocumentResponse[] {
  return read();
}

export function addMockDocument(filename: string): DocumentResponse {
  const doc: DocumentResponse = {
    id: crypto.randomUUID(),
    filename,
    pages: 0,
    status: "indexing",
    error_message: null,
    created_at: new Date().toISOString(),
  };
  const docs = [...read(), doc];
  write(docs);

  // Simula indexação assíncrona (o hook já faz polling a cada 2s).
  window.setTimeout(() => {
    const current = read();
    const idx = current.findIndex((d) => d.id === doc.id);
    if (idx === -1) return;
    current[idx] = {
      ...current[idx],
      status: "indexed",
      pages: Math.max(8, Math.floor(Math.random() * 40) + 1),
    };
    write(current);
  }, 2_500);

  return doc;
}

export function deleteMockDocument(documentId: string): void {
  write(read().filter((d) => d.id !== documentId));
}

export function findMockDocument(
  documentId: string | null | undefined,
): DocumentResponse | undefined {
  if (!documentId) return undefined;
  return read().find((d) => d.id === documentId);
}
