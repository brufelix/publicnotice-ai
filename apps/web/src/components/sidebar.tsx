"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { UserMenu } from "@/components/user-menu";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import type { DocumentResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilePlus, FileText, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDocumentDeleted?: (id: string) => void;
}

function DocItem({
  doc,
  selected,
  onClick,
  onDelete,
  isDeleting,
}: {
  doc: DocumentResponse;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const disabled = doc.status !== "indexed";
  const isProcessing = doc.status === "pending" || doc.status === "indexing";
  const canDelete = doc.status !== "indexing";

  return (
    <div
      className={cn(
        "group/item relative flex items-center rounded-md transition-colors duration-150",
        selected ? "bg-[var(--color-surface-2)]" : "hover:bg-[var(--color-surface-2)]/80",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={doc.error_message ?? doc.filename}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-2 pr-8 text-left text-[13px] transition-colors",
          selected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
          "group-hover/item:text-[var(--color-text)]",
          disabled && !isProcessing && "cursor-not-allowed opacity-50",
        )}
      >
        {isProcessing ? (
          <Loader2 size={15} className="shrink-0 animate-spin" />
        ) : (
          <FileText size={15} className="shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{doc.filename}</span>
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          title="Remover análise"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 rounded p-1",
            "text-[var(--color-text-muted)] opacity-0 scale-90",
            "transition-all duration-150 ease-out",
            "group-hover/item:opacity-100 group-hover/item:scale-100",
            "hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)]",
            "focus-visible:opacity-100 focus-visible:scale-100",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function Sidebar({ selectedId, onSelect, onDocumentDeleted }: SidebarProps) {
  const { data, isLoading, isError, error } = useDocuments();
  const { inputRef, upload, openPicker, onInputChange } = useDocumentUpload();
  const deleteDoc = useDeleteDocument();
  const [docToDelete, setDocToDelete] = useState<DocumentResponse | null>(null);

  const confirmDelete = async () => {
    if (!docToDelete) return;
    const doc = docToDelete;
    try {
      await deleteDoc.mutateAsync(doc.id);
      onDocumentDeleted?.(doc.id);
      if (selectedId === doc.id) {
        onSelect(null);
      }
      setDocToDelete(null);
    } catch {
      /* mutation error surfaced via deleteDoc.isError if needed */
    }
  };

  return (
    <>
      <ConfirmDialog
        open={docToDelete !== null}
        title="Remover análise"
        description={
          <>
            Tem certeza que deseja remover{" "}
            <span className="font-medium text-[var(--color-text)]">"{docToDelete?.filename}"</span>?
            O histórico de conversa deste documento também será apagado.
          </>
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={deleteDoc.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => !deleteDoc.isPending && setDocToDelete(null)}
      />
      <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-black py-3">
        <div className="px-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={upload.isPending}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-[var(--color-text-muted)]",
              "transition-colors hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <FilePlus size={15} className="shrink-0" />
            <span>{upload.isPending ? "Indexando…" : "Novo Documento"}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={onInputChange}
            className="hidden"
          />
        </div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col px-2">
          <div className="mb-1.5 flex items-center justify-between px-2">
            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
              Lista de Análises
            </span>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn(
                "text-[11px] transition-colors",
                selectedId === null
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              Todos
            </button>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-[var(--color-text-muted)]">
                <Loader2 size={14} className="animate-spin" />
                Carregando…
              </div>
            )}
            {isError && (
              <p className="px-2 py-1.5 text-[12px] text-[var(--color-danger)]">
                {(error as Error).message}
              </p>
            )}
            {deleteDoc.isError && (
              <p className="px-2 py-1.5 text-[12px] text-[var(--color-danger)]">
                {(deleteDoc.error as Error).message}
              </p>
            )}
            {data?.length === 0 && !isLoading && (
              <p className="px-2 py-1.5 text-[12px] text-[var(--color-text-muted)]">
                Nenhuma análise ainda.
              </p>
            )}
            {data?.map((doc) => (
              <DocItem
                key={doc.id}
                doc={doc}
                selected={selectedId === doc.id}
                onClick={() => onSelect(doc.id)}
                onDelete={() => setDocToDelete(doc)}
                isDeleting={deleteDoc.isPending && docToDelete?.id === doc.id}
              />
            ))}
          </div>
        </div>

        <UserMenu />
      </aside>
    </>
  );
}
