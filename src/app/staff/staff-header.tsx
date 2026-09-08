"use client";

import { useSession, signOut } from "next-auth/react";

export function StaffHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
      <h2 className="text-sm font-medium">Area Staff</h2>

      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground font-medium">{user.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Esci"
          >
            Esci
          </button>
        </div>
      )}
    </header>
  );
}
