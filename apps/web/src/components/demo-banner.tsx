"use client";

import { USE_MOCK_API } from "@/lib/config";
import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  if (!USE_MOCK_API) return null;

  return (
    <output className="flex shrink-0 items-center justify-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-primary-muted)] px-4 py-2 text-center text-xs text-[var(--color-text-muted)]">
      <FlaskConical size={14} className="shrink-0 text-[var(--color-primary)]" />
      <span>
        <strong className="font-medium text-[var(--color-text)]">Modo demonstração</strong>
        {" — "}
        dados e respostas simulados. Nenhum backend conectado.
      </span>
    </output>
  );
}
