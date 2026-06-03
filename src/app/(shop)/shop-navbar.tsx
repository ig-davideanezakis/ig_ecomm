"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { InfografLogo } from "@/components/infograf-logo";

export function ShopNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user;

  const accountHref = user?.role === "ADMIN" || user?.role === "STAFF"
    ? "/admin/dashboard"
    : "/account";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <InfografLogo className="h-7 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/products"
            className={`hover:text-primary transition-colors ${pathname === "/products" ? "text-primary" : ""}`}
          >
            Prodotti
          </Link>
          <Link
            href="/blog"
            className={`hover:text-primary transition-colors ${pathname === "/blog" ? "text-primary" : ""}`}
          >
            Blog
          </Link>
          <Link
            href="/#contact"
            className="hover:text-primary transition-colors"
          >
            Contatti
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Cart */}
          <Link
            href="/cart"
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Carrello"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
          </Link>

          {/* Account — redirect based on role */}
          <Link
            href={accountHref}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Account"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>

          {/* User menu — only when logged in */}
          {user && (
            <>
              <span className="hidden sm:block text-xs text-muted-foreground border-l pl-2 ml-1">
                {user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Esci"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
