"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function Verify2FAClient({ userRole }: { userRole: string }) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [remaining, setRemaining] = useState(30);

  // Countdown timer for TOTP window
  useEffect(() => {
    if (success) return;
    const interval = setInterval(() => {
      setRemaining(30 - Math.floor((Date.now() / 1000) % 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [success]);

  // If 2FA no longer needed, redirect
  useEffect(() => {
    if (session?.user && !session.user.needsTotp) {
      const target = session.user.role === "ADMIN" ? "/admin/dashboard" : "/";
      router.replace(target);
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      if (json.success) {
        setSuccess(true);
        await update({ totpVerified: true });
        const target = userRole === "ADMIN"
          ? "/admin/dashboard"
          : userRole === "STAFF"
            ? "/staff"
            : "/account";
        setTimeout(() => router.replace(target), 500);
      } else {
        setError(json.error ?? "Codice non valido. Riprova.");
      }
    } catch {
      setError("Errore di connessione. Riprova.");
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Verifica riuscita!</h1>
          <p className="text-sm text-muted-foreground">Reindirizzamento in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Autenticazione a due fattori</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci il codice a 6 cifre dalla tua app di autenticazione.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-md border border-input bg-background px-4 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-center text-xs text-muted-foreground">
              Codice valido per {remaining}s
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={token.length !== 6}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verifica
          </button>
        </form>

        <div className="text-center">
          <a href="/auth/logout" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Annulla e torna al login
          </a>
        </div>
      </div>
    </div>
  );
}
