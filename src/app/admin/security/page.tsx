import { authorize } from "@/lib/auth-helpers";
import { TotpSetup } from "@/components/totp-setup";
import { PasswordSetup } from "@/components/password-setup";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sicurezza — Infograf Store Admin",
};

export default async function AdminSecurityPage() {
  await authorize("ADMIN");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sicurezza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci le impostazioni di sicurezza del tuo account.
        </p>
      </div>

      <PasswordSetup />
      <TotpSetup />
    </div>
  );
}
