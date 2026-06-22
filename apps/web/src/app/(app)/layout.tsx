"use client";

import { DemoBanner } from "@/components/demo-banner";
import { AppChatProvider } from "@/components/providers/app-chat-provider";
import { UserProvider } from "@/components/providers/user-provider";
import { Sidebar } from "@/components/sidebar";
import type { ReactNode } from "react";

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden">
      <DemoBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function AppShellWithSidebar({ children }: { children: ReactNode }) {
  return (
    <AppChatProvider>
      <AppShell>
        <Sidebar />
        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </AppShell>
    </AppChatProvider>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <AppShellWithSidebar>{children}</AppShellWithSidebar>
    </UserProvider>
  );
}
