"use client";

import { type ChatRequestBody, postChatStream } from "@/lib/api";
import { parseSSE } from "@/lib/sse";
import type { Citation } from "@/lib/types";
import { useCallback, useRef, useState } from "react";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  status: "streaming" | "done" | "error";
  error?: string;
}

interface SendOptions {
  question: string;
  documentId?: string | null;
  topK?: number;
}

function newId(): string {
  return crypto.randomUUID();
}

export function useChatStream() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async ({ question, documentId, topK }: SendOptions) => {
      const trimmed = question.trim();
      if (!trimmed || isStreaming) return;

      const userTurn: ChatTurn = {
        id: newId(),
        role: "user",
        content: trimmed,
        status: "done",
      };
      const assistantId = newId();
      const assistantTurn: ChatTurn = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
      };

      // Snapshot history (excluding the new turns) to send to the API
      const history = turns
        .filter((t) => t.status === "done")
        .map((t) => ({ role: t.role, content: t.content }));

      setTurns((prev) => [...prev, userTurn, assistantTurn]);
      setIsStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const body: ChatRequestBody = {
        question: trimmed,
        document_id: documentId ?? null,
        history,
        top_k: topK,
      };

      try {
        const resp = await postChatStream(body, ctrl.signal);
        for await (const msg of parseSSE(resp)) {
          if (msg.event === "citations") {
            try {
              const parsed = JSON.parse(msg.data) as { citations: Citation[] };
              setTurns((prev) =>
                prev.map((t) => (t.id === assistantId ? { ...t, citations: parsed.citations } : t)),
              );
            } catch {
              /* ignore malformed frames */
            }
          } else if (msg.event === "token") {
            setTurns((prev) =>
              prev.map((t) => (t.id === assistantId ? { ...t, content: t.content + msg.data } : t)),
            );
          } else if (msg.event === "done") {
            setTurns((prev) =>
              prev.map((t) => (t.id === assistantId ? { ...t, status: "done" } : t)),
            );
            break;
          } else if (msg.event === "error") {
            setTurns((prev) =>
              prev.map((t) =>
                t.id === assistantId
                  ? { ...t, status: "error", error: msg.data || "stream_error" }
                  : t,
              ),
            );
            break;
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setTurns((prev) =>
            prev.map((t) => (t.id === assistantId ? { ...t, status: "done" } : t)),
          );
        } else {
          setTurns((prev) =>
            prev.map((t) =>
              t.id === assistantId ? { ...t, status: "error", error: (err as Error).message } : t,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, turns],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setTurns([]);
  }, []);

  return { turns, isStreaming, send, stop, reset };
}
