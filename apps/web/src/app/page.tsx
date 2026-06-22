"use client";

import { Chat } from "@/components/chat";
import { DemoBanner } from "@/components/demo-banner";
import { Sidebar } from "@/components/sidebar";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useState } from "react";

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { turns, isStreaming, send, stop, reset, removeSession } = useChatStream(selectedId);

  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden">
      <DemoBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDocumentDeleted={removeSession}
        />
        <Chat
          documentId={selectedId}
          turns={turns}
          isStreaming={isStreaming}
          send={send}
          stop={stop}
          reset={reset}
        />
      </div>
    </div>
  );
}
