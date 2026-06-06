"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register-from-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", password }),  // email will come from the order lookup
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Errore durante la creazione dell'account.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Errore di connessione.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {/* Success icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-bold">Ordine confermato!</h1>
      <p className="mt-2 text-muted-foreground">
        Grazie per il tuo acquisto.
        {orderNumber && <> Il tuo numero ordine è <strong>{orderNumber}</strong>.</>}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Riceverai una conferma via email con i dettagli della spedizione.
      </p>

      {!done && !skipped && (
        <div className="mt-10 rounded-lg border bg-card p-6 text-left">
          <h2 className="font-semibold text-lg">Salva i tuoi dati per i prossimi acquisti</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crea un account per visualizzare lo storico ordini e velocizzare il checkout.
          </p>

          <form onSubmit={handleCreateAccount} className="mt-4 space-y-3">
            <div>
              <label htmlFor="ty-password" className="text-sm font-medium block mb-1">Scegli una password</label>
              <input
                id="ty-password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri" required minLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={loading || !password}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "Creazione..." : "Crea account"}
              </button>
              <button type="button" onClick={() => setSkipped(true)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Salta
              </button>
            </div>
          </form>
        </div>
      )}

      {done && (
        <div className="mt-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-300">
          ✅ Account creato! I tuoi ordini sono stati collegati al profilo.
        </div>
      )}

      {skipped && (
        <p className="mt-6 text-sm text-muted-foreground">
          Puoi creare un account in qualsiasi momento dalla pagina di login.
        </p>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/" className="text-sm text-primary hover:underline">Torna alla homepage</Link>
        <Link href="/products" className="text-sm text-primary hover:underline">Continua gli acquisti</Link>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Caricamento...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
