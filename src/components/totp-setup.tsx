"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function TotpSetup() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "qr" | "verify" | "done">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const startSetup = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/totp-setup", { method: "POST" });
      const json = await res.json();
      if (json.qrCode) {
        setQrCode(json.qrCode);
        setSecret(json.secret);
        setStep("qr");
      } else {
        setError(json.error ?? "Errore durante la generazione.");
      }
    } catch {
      setError("Errore di connessione.");
    }
  };

  const verifySetup = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, setup: true }),
      });
      const json = await res.json();
      if (json.success) {
        setStep("done");
        await update({ totpVerified: false }); // refresh session
        router.refresh();
      } else {
        setError(json.error ?? "Codice non valido.");
      }
    } catch {
      setError("Errore di connessione.");
    }
  };

  const isEnabled = session?.user?.totpEnabled;

  if (isEnabled) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Autenticazione a due fattori</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">
            2FA attiva e funzionante
          </span>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Autenticazione a due fattori</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">
            2FA attivata con successo!
          </span>
        </div>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Configura 2FA</h3>
        <p className="text-sm text-muted-foreground">
          Scansiona il QR code con la tua app di autenticazione
          (Google Authenticator, Authy, 1Password, ecc.):
        </p>

        {qrCode && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="QR Code per 2FA"
              className="rounded-lg border"
              width={200}
              height={200}
            />
          </div>
        )}

        {secret && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">
              Oppure inserisci manualmente questa chiave:
            </p>
            <code className="rounded-md bg-muted px-3 py-1.5 text-sm font-mono break-all select-all">
              {secret}
            </code>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Verifica il codice:</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full text-center text-lg tracking-[0.5em] font-mono rounded-md border border-input bg-background px-4 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setStep("idle")}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={verifySetup}
            disabled={token.length !== 6}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Verifica e attiva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold">Autenticazione a due fattori</h3>
      <p className="text-sm text-muted-foreground">
        Aumenta la sicurezza del tuo account aggiungendo un secondo fattore
        di autenticazione. Dovrai scansionare un QR code con la tua app di
        autenticazione preferita.
      </p>
      <button
        onClick={startSetup}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Configura 2FA
      </button>
    </div>
  );
}
