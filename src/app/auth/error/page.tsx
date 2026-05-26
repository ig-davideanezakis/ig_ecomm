"use client";

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold">Errore di accesso</h1>
        <p className="text-sm text-muted-foreground">
          Qualcosa è andato storto. Riprova.
        </p>
        <Link
          href="/auth/login"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Riprova
        </Link>
      </div>
    </div>
  );
}
