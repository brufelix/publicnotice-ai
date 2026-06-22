import { USE_MOCK_API } from "./config";
import type { ChatHistoryMessage, DocumentResponse } from "./types";

export { USE_MOCK_API };

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`API ${resp.status}: ${text}`);
  }
  return (await resp.json()) as T;
}

async function listDocumentsReal(): Promise<DocumentResponse[]> {
  const resp = await fetch(`${API_URL}/api/v1/documents`, { cache: "no-store" });
  return handle<DocumentResponse[]>(resp);
}

async function uploadDocumentReal(file: File): Promise<DocumentResponse> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_URL}/api/v1/documents`, {
    method: "POST",
    body: form,
  });
  return handle<DocumentResponse>(resp);
}

async function deleteDocumentReal(documentId: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`API ${resp.status}: ${text}`);
  }
}

export interface ChatRequestBody {
  question: string;
  document_id?: string | null;
  history?: ChatHistoryMessage[];
  top_k?: number;
}

export function chatStreamUrl(): string {
  return `${API_URL}/api/v1/chat`;
}

async function postChatStreamReal(body: ChatRequestBody, signal?: AbortSignal): Promise<Response> {
  const resp = await fetch(chatStreamUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`Chat ${resp.status}: ${text}`);
  }
  return resp;
}

// ─── Public API (real ou mock conforme NEXT_PUBLIC_USE_MOCK_API) ─────────────

export async function listDocuments(): Promise<DocumentResponse[]> {
  if (USE_MOCK_API) {
    const mock = await import("./mock/api");
    return mock.listDocuments();
  }
  return listDocumentsReal();
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  if (USE_MOCK_API) {
    const mock = await import("./mock/api");
    return mock.uploadDocument(file);
  }
  return uploadDocumentReal(file);
}

export async function deleteDocument(documentId: string): Promise<void> {
  if (USE_MOCK_API) {
    const mock = await import("./mock/api");
    return mock.deleteDocument(documentId);
  }
  return deleteDocumentReal(documentId);
}

export async function postChatStream(
  body: ChatRequestBody,
  signal?: AbortSignal,
): Promise<Response> {
  if (USE_MOCK_API) {
    const mock = await import("./mock/api");
    return mock.postChatStream(body, signal);
  }
  return postChatStreamReal(body, signal);
}
