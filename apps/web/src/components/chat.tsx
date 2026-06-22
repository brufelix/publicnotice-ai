"use client";

import { type ChatTurn, useChatStream } from "@/hooks/use-chat-stream";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { useDocuments } from "@/hooks/use-documents";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bot, FileUp, Loader2, Send, Square, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CitationChip } from "./citation-chip";

const SUGGESTIONS = [
  "Quando abrem as inscrições?",
  "Qual o valor da taxa de inscrição?",
  "Quais são os requisitos para o cargo?",
];

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

function CitationModal({ citation, onClose }: CitationModalProps) {
  if (!citation) return null;
  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="animate-fade-up max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Trecho [{citation.index}] · página {citation.page}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
          {citation.snippet}
        </p>
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Similaridade: {(citation.score * 100).toFixed(1)}%
        </p>
      </div>
    </dialog>
  );
}

interface ChatProps {
  documentId: string | null;
  turns: ChatTurn[];
  isStreaming: boolean;
  send: ReturnType<typeof useChatStream>["send"];
  stop: () => void;
  reset: () => void;
}

export function Chat({ documentId, turns, isStreaming, send, stop, reset }: ChatProps) {
  const { data: documents } = useDocuments();
  const { inputRef, upload, openPicker, isDragging, onInputChange, dragHandlers } =
    useDocumentUpload();
  const [draft, setDraft] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasIndexedDocs = documents?.some((d) => d.status === "indexed") ?? false;
  const showUploadPrompt = !hasIndexedDocs && turns.length === 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every turn change
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isStreaming || !hasIndexedDocs) return;
    void send({ question: draft, documentId });
    setDraft("");
  };

  const onSuggestion = (question: string) => {
    if (isStreaming) return;
    void send({ question, documentId });
  };

  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col bg-black" {...dragHandlers}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onInputChange}
        className="hidden"
      />

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <div className="rounded-2xl border border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary-muted)] px-8 py-6 text-center">
            <FileUp size={32} className="mx-auto mb-2 text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text)]">Solte o PDF para importar</p>
          </div>
        </div>
      )}

      {turns.length > 0 && (
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-black px-8 py-3">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)]">
            {documentId ? "1 documento selecionado" : "Todos os documentos"}
          </h2>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            Limpar conversa
          </button>
        </header>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-black px-6 py-8 md:px-10">
        {showUploadPrompt && (
          <div className="mx-auto flex max-w-md flex-col items-center pt-20 text-center animate-fade-up">
            <button
              type="button"
              onClick={openPicker}
              disabled={upload.isPending}
              className={cn(
                "group flex w-full flex-col items-center rounded-2xl border border-dashed px-8 py-10 transition-all duration-200",
                "border-[var(--color-border-strong)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-solid)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <div
                className={cn(
                  "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
                  "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
                  "group-hover:bg-[var(--color-primary-muted)] group-hover:text-[var(--color-primary)]",
                )}
              >
                {upload.isPending ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <FileUp size={24} />
                )}
              </div>

              {upload.isPending ? (
                <>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    Indexando documento…
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                    Aguarde enquanto preparamos o edital para análise.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--color-text)]">Adicione um edital</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Arraste um PDF para cá ou{" "}
                    <span className="text-[var(--color-text)] underline decoration-[var(--color-border-strong)] underline-offset-2 group-hover:decoration-[var(--color-primary)]">
                      clique para selecionar
                    </span>
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-text-muted)]">Apenas arquivos PDF</p>
                </>
              )}
            </button>

            {upload.isError && (
              <p className="mt-4 text-xs text-[var(--color-danger)]">
                {(upload.error as Error).message}
              </p>
            )}
          </div>
        )}

        {!showUploadPrompt && turns.length === 0 && (
          <div className="mx-auto flex max-w-2xl flex-col items-center pt-16 text-center animate-fade-up">
            <h3 className="text-base font-medium tracking-tight">Pergunte sobre o edital</h3>
            <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
              Faça perguntas em linguagem natural. A resposta virá com referências às páginas do
              documento.
            </p>
            <div className="mt-8 flex w-full flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestion(suggestion)}
                  className={cn(
                    "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-solid)] px-4 py-3 text-left text-sm",
                    "text-[var(--color-text-muted)] transition-all duration-200",
                    "hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-muted)] hover:text-[var(--color-text)]",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-6">
          {turns.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex gap-3 animate-fade-up",
                t.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  t.role === "user"
                    ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
                )}
              >
                {t.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  t.role === "user"
                    ? "rounded-tr-md bg-gradient-to-br from-[var(--color-primary)] to-[#6d28d9] text-white shadow-lg shadow-violet-500/15"
                    : "rounded-tl-md border border-[var(--color-border)] bg-[var(--color-surface-solid)] text-[var(--color-text)]",
                  t.status === "error" &&
                    "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10",
                )}
              >
                {t.content ||
                  (t.status === "streaming" && (
                    <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] animate-pulse-dot" />
                      {t.awaitingTokens && t.citations
                        ? "Gerando resposta… o modelo local pode levar até 1 minuto."
                        : "Buscando trechos no documento…"}
                    </span>
                  ))}
                {t.status === "streaming" && t.content && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--color-primary)]" />
                )}
                {t.status === "error" && (
                  <p className="mt-2 text-xs text-[var(--color-danger)]">Erro: {t.error}</p>
                )}
                {t.role === "assistant" && t.citations && t.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-border)] pt-3">
                    {t.citations.map((c) => (
                      <CitationChip key={c.chunk_id} citation={c} onClick={setActiveCitation} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-black px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] p-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              hasIndexedDocs
                ? "Pergunte algo sobre o edital…"
                : "Adicione um documento para começar…"
            }
            disabled={isStreaming || !hasIndexedDocs}
            className={cn(
              "flex-1 bg-transparent px-3 py-2.5 text-sm outline-none",
              "placeholder:text-[var(--color-text-muted)]",
              "disabled:opacity-60",
            )}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-danger)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              <Square size={14} /> Parar
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim() || !hasIndexedDocs}
              className={cn(
                "flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white",
                "transition-all duration-200 hover:bg-[var(--color-primary-hover)]",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Send size={14} /> Enviar
            </button>
          )}
        </div>
      </form>

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </main>
  );
}
