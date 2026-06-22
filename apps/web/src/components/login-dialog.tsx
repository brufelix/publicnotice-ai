"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface LoginDialogProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function LoginDialog({ open, value, onChange, onSave, onCancel }: LoginDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const canSave = value.trim().length > 0;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        className="animate-fade-up w-full max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text)]">Entrar</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Informe seu nome para personalizar a experiência.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
            Nome
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSave) onSave();
            }}
            placeholder="Seu nome"
            maxLength={80}
            className={cn(
              "w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2.5",
              "text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
              "outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]",
            )}
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              "bg-[var(--color-primary-muted)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            Salvar
          </button>
        </div>
      </div>
    </dialog>
  );
}
