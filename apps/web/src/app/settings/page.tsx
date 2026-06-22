import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Em breve — preferências da conta e da aplicação.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
      >
        Voltar ao chat
      </Link>
    </main>
  );
}
