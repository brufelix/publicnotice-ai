"use client";

import { useUploadDocument } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { useRef } from "react";

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();

  const onPick = () => inputRef.current?.click();
  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await upload.mutateAsync(file);
    } catch {
      /* error rendered below */
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onPick}
        disabled={upload.isPending}
        className={cn(
          "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "bg-[var(--color-primary)] text-white transition hover:bg-[var(--color-primary-hover)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <Upload size={16} />
        {upload.isPending ? "Indexando..." : "Enviar PDF"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onChange}
        className="hidden"
      />
      {upload.isError && (
        <p className="text-xs text-[var(--color-danger)]">
          Falha no upload: {(upload.error as Error).message}
        </p>
      )}
    </div>
  );
}
