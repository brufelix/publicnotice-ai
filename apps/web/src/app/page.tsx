"use client";

import { Chat } from "@/components/chat";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
      <Chat documentId={selectedId} />
    </div>
  );
}
