"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  // If already authenticated, redirect based on role
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.needsTotp) {
        router.replace("/auth/verify-2fa");
      } else if (session.user.role === "ADMIN") {
        router.replace("/admin/dashboard");
      } else if (session.user.role === "STAFF") {
        router.replace("/staff");
      } else {
        router.replace("/");
      }
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Pass a default callbackUrl so the magic link redirects to a sensible page
    const callbackUrl = new URL(window.location.href).searchParams.get("callbackUrl") || "/";
    await signIn("resend", { email, redirect: false, callbackUrl });
    setSent(true);
  }

  // Show nothing while checking session (avoids flash)
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Link inviato!</h1>
          <p className="text-sm text-muted-foreground">
            Controlla la tua casella email <strong>{email}</strong> per il link di accesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Accedi</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci la tua email per ricevere un link magico
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tua@email.it"
            required
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Invia link magico
          </button>
        </form>
      </div>
    </div>
  );
}
