"use client";

import { useChatStream } from "@/hooks/use-chat-stream";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CitationChip } from "./citation-chip";

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

function CitationModal({ citation, onClose }: CitationModalProps) {
  if (!citation) return null;
  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Trecho [{citation.index}] — página {citation.page}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
          {citation.snippet}
        </p>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Similaridade: {(citation.score * 100).toFixed(1)}%
        </p>
      </div>
    </dialog>
  );
}

interface ChatProps {
  documentId: string | null;
}

export function Chat({ documentId }: ChatProps) {
  const { turns, isStreaming, send, stop, reset } = useChatStream();
  const [draft, setDraft] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every turn change
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isStreaming) return;
    void send({ question: draft, documentId });
    setDraft("");
  };

  return (
    <main className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
        <div>
          <h2 className="text-sm font-semibold">
            {documentId ? "Conversa sobre 1 documento" : "Conversa sobre todos os documentos"}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Respostas com citações ao trecho exato do edital.
          </p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Limpar
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {turns.length === 0 && (
          <div className="mx-auto max-w-md pt-10 text-center text-sm text-[var(--color-text-muted)]">
            <p className="mb-2">Faça uma pergunta sobre o edital. Exemplos:</p>
            <ul className="space-y-1 text-left">
              <li>• Quando abrem as inscrições?</li>
              <li>• Qual o valor da taxa de inscrição?</li>
              <li>• Quais são os requisitos para o cargo?</li>
            </ul>
          </div>
        )}

        {turns.map((t) => (
          <div
            key={t.id}
            className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                t.role === "user"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text)]",
                t.status === "error" &&
                  "border border-[var(--color-danger)] bg-[var(--color-surface)]",
              )}
            >
              {t.content ||
                (t.status === "streaming" && (
                  <span className="text-[var(--color-text-muted)]">Pensando…</span>
                ))}
              {t.status === "streaming" && t.content && (
                <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[var(--color-text-muted)]" />
              )}
              {t.status === "error" && (
                <p className="mt-2 text-xs text-[var(--color-danger)]">Erro: {t.error}</p>
              )}
              {t.role === "assistant" && t.citations && t.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.citations.map((c) => (
                    <CitationChip key={c.chunk_id} citation={c} onClick={setActiveCitation} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pergunte algo sobre o edital…"
          disabled={isStreaming}
          className={cn(
            "flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]",
            "px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]",
            "disabled:opacity-60",
          )}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-1 rounded-md bg-[var(--color-danger)] px-3 py-2 text-sm font-medium text-white"
          >
            <Square size={14} /> Parar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            className={cn(
              "flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white",
              "transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60",
            )}
          >
            <Send size={14} /> Enviar
          </button>
        )}
      </form>

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </main>
  );
}
