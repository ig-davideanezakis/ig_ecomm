"use client";

import { useSession, signOut } from "next-auth/react";

export function AdminHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    STAFF: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CUSTOMER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
      <h2 className="text-sm font-medium">Pannello di amministrazione</h2>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex flex-col items-end">
                <span className="text-foreground font-medium leading-tight">
                  {user.email}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
                    roleColors[user.role] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Esci"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block mr-1"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Esci
            </button>
          </>
        )}
      </div>
    </header>
  );
}
