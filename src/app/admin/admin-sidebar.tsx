"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { InfografLogo } from "@/components/infograf-logo";

const sidebarLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Prodotti", icon: "📦" },
  { href: "/admin/categories", label: "Categorie", icon: "🏷️" },
  { href: "/admin/brands", label: "Marche", icon: "🏢" },
  { href: "/admin/orders", label: "Ordini", icon: "📋" },
  { href: "/admin/stock", label: "Magazzino", icon: "📦" },
  { href: "/admin/coupons", label: "Coupon", icon: "🎫" },
  { href: "/admin/customers", label: "Utenti", icon: "👥" },
  { href: "/admin/pages", label: "Pagine", icon: "📄" },
  { href: "/admin/blog", label: "Blog", icon: "✍️" },
  { href: "/admin/settings", label: "Impostazioni", icon: "⚙️" },
  { href: "/admin/security", label: "Sicurezza", icon: "🔐" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <Link href="/admin/dashboard" className="block text-foreground">
          <InfografLogo className="h-5 w-auto" />
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Torna al negozio
        </Link>
      </div>
    </aside>
  );
}
