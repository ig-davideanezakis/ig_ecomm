import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <header className="fixed top-0 w-full flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm z-50">
        {/* Logo SVG — changes color with theme via currentColor */}
        <Image
          src="/logo.svg"
          alt="Infograf"
          width={160}
          height={32}
          priority
          className="h-8 w-auto"
        />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 w-full flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight">
            Computer Store
          </h1>
          <p className="text-lg text-muted-foreground">
            Il tuo punto di riferimento per computer, componenti e assistenza IT a Palermo. Dal 1992.
          </p>
          <div className="flex gap-4 mt-4">
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 neon-glow transition-all"
            >
              Scopri i prodotti
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Contattaci
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
