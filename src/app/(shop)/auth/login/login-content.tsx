"use client";

/* eslint-disable @typescript-eslint/no-unused-expressions */

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "idle" | "sent" | "password";

export default function LoginPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [step, setStep] = useState<Step>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const magicRef = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.needsTotp) return router.replace("/auth/verify-2fa");
      if (session.user.role === "ADMIN") return router.replace("/admin/dashboard");
      if (session.user.role === "STAFF") return router.replace("/staff");
      router.replace(callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  // Handle magic link state via ref to avoid ESLint setState-after-await
  useEffect(() => {
    if (magicRef.current) {
      setStep("sent");
      magicRef.current = false;
    }
  }, [magicLinkSent]);

  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (json.role === "STAFF" || json.role === "ADMIN") {
        setUserRole(json.role);
        setStep("password");
      } else {
        await signIn("resend", { email, redirect: false, callbackUrl });
        // Trigger state change via ref outside async path
        setMagicLinkSent(true);
      }
    } catch {
      setError("Errore di connessione. Riprova.");
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o password non validi.");
      return;
    }
    router.refresh();
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  // ── Magic Link sent ────────────────────────────────────────────
  if (step === "sent") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Link inviato!</h1>
          <p className="text-sm text-muted-foreground">
            Controlla la tua casella <strong>{email}</strong> per il link di accesso.
          </p>
          <button
            onClick={() => { setStep("idle"); setEmail(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Usa un&apos;altra email
          </button>
        </div>
      </div>
    );
  }

  // ── Password form (STAFF / ADMIN) ──────────────────────────────
  if (step === "password") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Accesso riservato</h1>
            <p className="text-sm text-muted-foreground">
              {email} — {userRole === "ADMIN" ? "Amministratore" : "Staff"}
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoFocus
                className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => { setStep("idle"); setEmail(""); setPassword(""); setUserRole(null); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Usa un altro account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main login (email entry + Google) ──────────────────────────
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Accedi</h1>
          <p className="text-sm text-muted-foreground">Scegli il metodo più comodo per te</p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continua con Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">oppure con la tua email</span>
          </div>
        </div>

        <form onSubmit={handleCheckEmail} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tua@email.it"
            required
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Verifica in corso..." : "Continua"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          I clienti riceveranno un link magico via email.<br />
          Lo staff e gli amministratori accedono con password.
        </p>
      </div>
    </div>
  );
}
