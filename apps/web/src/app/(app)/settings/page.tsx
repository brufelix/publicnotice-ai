"use client";

import { useUser } from "@/components/providers/user-provider";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { user, hydrated, enabled, updateName } = useUser();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  if (!enabled || !hydrated) {
    return (
      <main className="flex h-full items-center justify-center bg-black p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Carregando…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-black p-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          Faça login para acessar as configurações.
        </p>
        <Link
          href="/"
          className="text-sm text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
        >
          Voltar ao chat
        </Link>
      </main>
    );
  }

  const canSave = name.trim().length > 0 && name.trim() !== user.name;

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    updateName(name);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="h-full overflow-y-auto bg-black">
      <div className="mx-auto max-w-lg px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={16} />
          Voltar ao chat
        </Link>

        <h1 className="text-xl font-semibold text-[var(--color-text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Gerencie suas preferências de perfil.
        </p>

        <section className="mt-8 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Perfil</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Este nome aparece no menu da sidebar.
          </p>

          <form onSubmit={onSave} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                Nome
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                maxLength={80}
                className={cn(
                  "w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2.5",
                  "text-sm text-[var(--color-text)] outline-none transition",
                  "focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]",
                )}
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!canSave}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition",
                  "bg-[var(--color-primary-muted)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                Salvar
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                  <Check size={14} />
                  Salvo
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
