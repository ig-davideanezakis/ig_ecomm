import Link from "next/link";
import { ShopNavbar } from "./shop-navbar";
import { InfografLogo } from "@/components/infograf-logo";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <ShopNavbar />

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
