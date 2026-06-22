import type { ChatHistoryMessage, DocumentResponse } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`API ${resp.status}: ${text}`);
  }
  return (await resp.json()) as T;
}

export async function listDocuments(): Promise<DocumentResponse[]> {
  const resp = await fetch(`${API_URL}/api/v1/documents`, { cache: "no-store" });
  return handle<DocumentResponse[]>(resp);
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_URL}/api/v1/documents`, {
    method: "POST",
    body: form,
  });
  return handle<DocumentResponse>(resp);
}

export async function deleteDocument(documentId: string): Promise<void> {
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

export async function postChatStream(
  body: ChatRequestBody,
  signal?: AbortSignal,
): Promise<Response> {
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
