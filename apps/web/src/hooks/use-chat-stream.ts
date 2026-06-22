"use client";

import { type ChatRequestBody, postChatStream } from "@/lib/api";
import { parseSSE } from "@/lib/sse";
import type { Citation } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  status: "streaming" | "done" | "error";
  error?: string;
  awaitingTokens?: boolean;
}

export const ALL_DOCUMENTS_KEY = "__all__";

export function chatSessionKey(documentId: string | null): string {
  return documentId ?? ALL_DOCUMENTS_KEY;
}

interface SendOptions {
  question: string;
  documentId?: string | null;
  topK?: number;
}

function newId(): string {
  return crypto.randomUUID();
}

export function useChatStream(documentId: string | null) {
  const sessionKey = chatSessionKey(documentId);
  const [sessions, setSessions] = useState<Record<string, ChatTurn[]>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamingSessionKeyRef = useRef<string | null>(null);

  const turns = sessions[sessionKey] ?? [];

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const updateSessionTurns = useCallback(
    (key: string, updater: (turns: ChatTurn[]) => ChatTurn[]) => {
      setSessions((prev) => ({
        ...prev,
        [key]: updater(prev[key] ?? []),
      }));
    },
    [],
  );

  const send = useCallback(
    async ({ question, documentId: docId, topK }: SendOptions) => {
      const trimmed = question.trim();
      if (!trimmed || isStreaming) return;

      const key = chatSessionKey(docId ?? null);
      streamingSessionKeyRef.current = key;

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
        awaitingTokens: true,
      };

      let history: { role: "user" | "assistant"; content: string }[] = [];
      setSessions((prev) => {
        const currentTurns = prev[key] ?? [];
        history = currentTurns
          .filter((t) => t.status === "done")
          .map((t) => ({ role: t.role, content: t.content }));
        return {
          ...prev,
          [key]: [...currentTurns, userTurn, assistantTurn],
        };
      });

      setIsStreaming(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const body: ChatRequestBody = {
        question: trimmed,
        document_id: docId ?? null,
        history,
        top_k: topK,
      };

      let gotDone = false;

      const patchAssistant = (patch: Partial<ChatTurn>) => {
        updateSessionTurns(key, (sessionTurns) =>
          sessionTurns.map((t) => (t.id === assistantId ? { ...t, ...patch } : t)),
        );
      };

      try {
        const resp = await postChatStream(body, ctrl.signal);
        for await (const msg of parseSSE(resp)) {
          if (msg.event === "citations") {
            try {
              const parsed = JSON.parse(msg.data) as { citations: Citation[] };
              patchAssistant({ citations: parsed.citations });
            } catch {
              /* ignore malformed frames */
            }
          } else if (msg.event === "token") {
            updateSessionTurns(key, (sessionTurns) =>
              sessionTurns.map((t) =>
                t.id === assistantId
                  ? { ...t, content: t.content + msg.data, awaitingTokens: false }
                  : t,
              ),
            );
          } else if (msg.event === "done") {
            gotDone = true;
            patchAssistant({ status: "done", awaitingTokens: false });
            break;
          } else if (msg.event === "error") {
            gotDone = true;
            patchAssistant({
              status: "error",
              awaitingTokens: false,
              error: msg.data || "stream_error",
            });
            break;
          }
        }

        if (!gotDone) {
          updateSessionTurns(key, (sessionTurns) =>
            sessionTurns.map((t) => {
              if (t.id !== assistantId || t.status !== "streaming") return t;
              if (t.content) return { ...t, status: "done", awaitingTokens: false };
              return {
                ...t,
                status: "error",
                awaitingTokens: false,
                error: "A resposta foi interrompida antes de concluir.",
              };
            }),
          );
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          patchAssistant({ status: "done", awaitingTokens: false });
        } else {
          patchAssistant({
            status: "error",
            awaitingTokens: false,
            error: (err as Error).message,
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        streamingSessionKeyRef.current = null;
      }
    },
    [isStreaming, updateSessionTurns],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setSessions((prev) => ({ ...prev, [sessionKey]: [] }));
  }, [sessionKey]);

  const removeSession = useCallback((documentIdToRemove: string) => {
    const key = chatSessionKey(documentIdToRemove);
    setSessions((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return { turns, isStreaming, send, stop, reset, removeSession };
}
