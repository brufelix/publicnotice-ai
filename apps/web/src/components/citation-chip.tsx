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
        "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)]",
        "bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium",
        "text-[var(--color-text)] transition hover:border-[var(--color-primary)]",
      )}
    >
      <span className="text-[var(--color-primary)]">[{citation.index}]</span>
      <span className="text-[var(--color-text-muted)]">pág {citation.page}</span>
    </button>
  );
}
