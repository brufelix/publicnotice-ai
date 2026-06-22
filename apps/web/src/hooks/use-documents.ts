"use client";

import { deleteDocument, listDocuments, uploadDocument } from "@/lib/api";
import type { DocumentResponse } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const KEY = ["documents"] as const;

export function useDocuments() {
  return useQuery<DocumentResponse[]>({
    queryKey: KEY,
    queryFn: listDocuments,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll while anything is still indexing
      const pending = data?.some((d) => d.status === "pending" || d.status === "indexing");
      return pending ? 2_000 : false;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
