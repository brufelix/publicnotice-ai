import type { ChatRequestBody } from "../api";
import type { DocumentResponse } from "../types";
import { createMockChatStreamResponse } from "./chat-stream";
import { addMockDocument, deleteMockDocument, listMockDocuments } from "./document-store";

export async function listDocuments(): Promise<DocumentResponse[]> {
  return listMockDocuments();
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  await new Promise((r) => setTimeout(r, 300));
  return addMockDocument(file.name);
}

export async function deleteDocument(documentId: string): Promise<void> {
  deleteMockDocument(documentId);
}

export async function postChatStream(
  body: ChatRequestBody,
  signal?: AbortSignal,
): Promise<Response> {
  await new Promise((r) => setTimeout(r, 150));
  return createMockChatStreamResponse(body, signal);
}
