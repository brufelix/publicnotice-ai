"use client";

import { useUploadDocument } from "@/hooks/use-documents";
import { useCallback, useRef, useState } from "react";

export function useDocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        return;
      }
      await upload.mutateAsync(file);
    },
    [upload],
  );

  const onInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        await uploadFile(file);
      } catch {
        /* surfaced via upload.isError */
      }
    },
    [uploadFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      try {
        await uploadFile(file);
      } catch {
        /* surfaced via upload.isError */
      }
    },
    [uploadFile],
  );

  return {
    inputRef,
    upload,
    openPicker,
    isDragging,
    onInputChange,
    dragHandlers: { onDragOver, onDragLeave, onDrop },
  };
}
