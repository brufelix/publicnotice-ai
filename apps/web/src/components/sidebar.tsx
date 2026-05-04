"use client";

import { useDocuments } from "@/hooks/use-documents";
import type { DocumentResponse, DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { UploadButton } from "./upload-button";

interface SidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending: "Aguardando",
  indexing: "Indexando",
  indexed: "Pronto",
  failed: "Falhou",
};

function StatusIcon({ status }: { status: DocumentStatus }) {
  if (status === "indexed")
    return <CheckCircle2 size={14} className="text-[var(--color-success)]" />;
  if (status === "failed") return <XCircle size={14} className="text-[var(--color-danger)]" />;
  return <Loader2 size={14} className="animate-spin text-[var(--color-warning)]" />;
}

function DocItem({
  doc,
  selected,
  onClick,
}: {
  doc: DocumentResponse;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled = doc.status !== "indexed";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={doc.error_message ?? doc.filename}
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition",
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
          : "border-transparent bg-[var(--color-surface)] hover:border-[var(--color-border)]",
        disabled && "cursor-not-allowed opacity-70",
      )}
    >
      <FileText size={16} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{doc.filename}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <StatusIcon status={doc.status} />
          <span>{STATUS_LABEL[doc.status]}</span>
          {doc.status === "indexed" && <span>· {doc.pages} págs</span>}
        </div>
      </div>
    </button>
  );
}

export function Sidebar({ selectedId, onSelect }: SidebarProps) {
  const { data, isLoading, isError, error } = useDocuments();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-4 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div>
        <h1 className="text-base font-semibold">📜 publicnotice-ai</h1>
        <p className="text-xs text-[var(--color-text-muted)]">Converse com seus editais</p>
      </div>

      <UploadButton />

      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
        <span>Documentos</span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "rounded px-1.5 py-0.5 hover:bg-[var(--color-surface-2)]",
            selectedId === null && "text-[var(--color-primary)]",
          )}
        >
          Todos
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Carregando…</p>}
        {isError && (
          <p className="text-sm text-[var(--color-danger)]">{(error as Error).message}</p>
        )}
        {data?.length === 0 && !isLoading && (
          <p className="text-sm text-[var(--color-text-muted)]">Envie um PDF para começar.</p>
        )}
        {data?.map((doc) => (
          <DocItem
            key={doc.id}
            doc={doc}
            selected={selectedId === doc.id}
            onClick={() => onSelect(doc.id)}
          />
        ))}
      </div>
    </aside>
  );
}
