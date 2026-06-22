"use client";

import { useChatStream } from "@/hooks/use-chat-stream";
import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

interface AppChatContextValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  turns: ReturnType<typeof useChatStream>["turns"];
  isStreaming: boolean;
  send: ReturnType<typeof useChatStream>["send"];
  stop: () => void;
  reset: () => void;
  removeSession: (id: string) => void;
}

const AppChatContext = createContext<AppChatContextValue | null>(null);

export function AppChatProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { turns, isStreaming, send, stop, reset, removeSession } = useChatStream(selectedId);

  const value = useMemo(
    () => ({
      selectedId,
      setSelectedId,
      turns,
      isStreaming,
      send,
      stop,
      reset,
      removeSession,
    }),
    [selectedId, turns, isStreaming, send, stop, reset, removeSession],
  );

  return <AppChatContext.Provider value={value}>{children}</AppChatContext.Provider>;
}

export function useAppChat(): AppChatContextValue {
  const ctx = useContext(AppChatContext);
  if (!ctx) {
    throw new Error("useAppChat must be used within AppChatProvider");
  }
  return ctx;
}
