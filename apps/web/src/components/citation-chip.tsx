"use client";

import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CitationChipProps {
  citation: Citation;
  onClick?: (c: Citation) => void;
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      title={citation.snippet}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)]",
        "bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs font-medium",
        "text-[var(--color-text)] transition-all duration-200",
        "hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary-muted)]",
      )}
    >
      <span className="font-semibold text-[var(--color-primary)]">[{citation.index}]</span>
      <span className="text-[var(--color-text-muted)]">pág. {citation.page}</span>
    </button>
  );
}
