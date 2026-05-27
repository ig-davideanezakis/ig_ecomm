import Link from "next/link";
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
  { href: "/admin/customers", label: "Clienti", icon: "👥" },
  { href: "/admin/blog", label: "Blog", icon: "✍️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <Link href="/admin/dashboard" className="block">
            <InfografLogo className="h-5 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center px-6 bg-background">
          <h2 className="text-sm font-medium">Pannello di amministrazione</h2>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
