"use client";

import { LoginDialog } from "@/components/login-dialog";
import { useUser } from "@/hooks/use-user";
import { userInitial } from "@/lib/user-storage";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function UserMenu() {
  const router = useRouter();
  const { user, hydrated, login, logout, enabled } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  if (!enabled || !hydrated) return null;

  const openLogin = () => {
    setDraftName("");
    setLoginOpen(true);
  };

  const saveLogin = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    login(trimmed);
    setLoginOpen(false);
    setDraftName("");
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  const handleSettings = () => {
    setMenuOpen(false);
    router.push("/settings");
  };

  if (!user) {
    return (
      <>
        <LoginDialog
          open={loginOpen}
          value={draftName}
          onChange={setDraftName}
          onSave={saveLogin}
          onCancel={() => setLoginOpen(false)}
        />
        <div className="border-t border-[var(--color-border)] px-2 pt-2">
          <button
            type="button"
            onClick={openLogin}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px]",
              "text-[var(--color-text-muted)] transition-colors",
              "hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text)]",
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-text-muted)]">
              ?
            </span>
            <span>Login</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <LoginDialog
        open={loginOpen}
        value={draftName}
        onChange={setDraftName}
        onSave={saveLogin}
        onCancel={() => setLoginOpen(false)}
      />
      <div ref={rootRef} className="relative border-t border-[var(--color-border)] px-2 pt-2">
        {menuOpen && (
          <div
            className={cn(
              "absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-xl",
              "border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] py-1 shadow-2xl",
              "animate-fade-up",
            )}
          >
            <button
              type="button"
              onClick={handleSettings}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[var(--color-text)] transition hover:bg-[var(--color-surface-2)]"
            >
              <Settings size={15} className="shrink-0 text-[var(--color-text-muted)]" />
              Settings
            </button>
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[var(--color-text)] transition hover:bg-[var(--color-surface-2)]"
            >
              <LogOut size={15} className="shrink-0 text-[var(--color-text-muted)]" />
              Log out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
            menuOpen ? "bg-[var(--color-surface-2)]" : "hover:bg-[var(--color-surface-2)]/60",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-semibold text-[var(--color-text)]">
            {userInitial(user.name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-text)]">
            {user.name}
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        </button>
      </div>
    </>
  );
}
