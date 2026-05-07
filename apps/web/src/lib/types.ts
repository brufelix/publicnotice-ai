export type DocumentStatus = "pending" | "indexing" | "indexed" | "failed";

export interface DocumentResponse {
  id: string;
  filename: string;
  pages: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
}

export interface Citation {
  index: number;
  chunk_id: string;
  document_id: string;
  page: number;
  snippet: string;
  score: number;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}
