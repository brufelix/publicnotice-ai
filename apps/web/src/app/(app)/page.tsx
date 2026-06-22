"use client";

import { Chat } from "@/components/chat";
import { useAppChat } from "@/components/providers/app-chat-provider";

export default function HomePage() {
  const { turns, isStreaming, send, stop, reset, selectedId } = useAppChat();

  return (
    <Chat
      documentId={selectedId}
      turns={turns}
      isStreaming={isStreaming}
      send={send}
      stop={stop}
      reset={reset}
    />
  );
}
