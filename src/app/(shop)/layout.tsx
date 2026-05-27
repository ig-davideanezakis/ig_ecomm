import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { InfografLogo } from "@/components/infograf-logo";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <InfografLogo className="h-7 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/products" className="hover:text-primary transition-colors">
              Prodotti
            </Link>
            <Link href="/blog" className="hover:text-primary transition-colors">
              Blog
            </Link>
            <Link href="/#contact" className="hover:text-primary transition-colors">
              Contatti
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </Link>
            <Link
              href="/account"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <InfografLogo className="h-6 w-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Dal 1992 il tuo punto di riferimento per computer, componenti e assistenza IT a Palermo.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Categorie</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/products" className="hover:text-foreground transition-colors">PC Desktop</Link></li>
                <li><Link href="/products" className="hover:text-foreground transition-colors">Portatili</Link></li>
                <li><Link href="/products" className="hover:text-foreground transition-colors">Componenti</Link></li>
                <li><Link href="/products" className="hover:text-foreground transition-colors">Periferiche</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Info</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/#about" className="hover:text-foreground transition-colors">Chi siamo</Link></li>
                <li><Link href="/#contact" className="hover:text-foreground transition-colors">Contatti</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Contatti</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Palermo, Sicilia</li>
                <li>info@infografstore.it</li>
                <li>+39 091 XXX XXXX</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Infograf. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
