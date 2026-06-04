"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PasswordSetup() {
  const router = useRouter();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPw.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Le password non corrispondono.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => router.refresh(), 1500);
      } else {
        setError(json.error ?? "Errore durante l'impostazione della password.");
      }
    } catch {
      setError("Errore di connessione.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Password</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">
            Password impostata con successo!
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold">Password di accesso</h3>
      <p className="text-sm text-muted-foreground">
        Imposta una password per accedere con email + password invece del magic link.
        Consigliata per accessi frequenti al pannello di amministrazione.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <div>
          <label htmlFor="current-pw" className="text-xs font-medium text-muted-foreground mb-1 block">
            Password attuale (se già impostata)
          </label>
          <input
            id="current-pw"
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Lascia vuoto se è la prima volta"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="new-pw" className="text-xs font-medium text-muted-foreground mb-1 block">
            Nuova password
          </label>
          <input
            id="new-pw"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Minimo 8 caratteri"
            required
            minLength={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="confirm-pw" className="text-xs font-medium text-muted-foreground mb-1 block">
            Conferma password
          </label>
          <input
            id="confirm-pw"
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Ripeti la password"
            required
            minLength={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !newPw || !confirmPw}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Salvataggio..." : "Salva password"}
        </button>
      </form>
    </div>
  );
}
