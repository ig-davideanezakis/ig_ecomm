export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-lg py-24">
        {/* Hero section */}
        <h1 className="text-4xl font-bold tracking-tight">
          Computer Store
        </h1>
        <p className="text-lg text-muted-foreground">
          Il tuo punto di riferimento per computer, componenti e assistenza IT a Palermo. Dal 1992.
        </p>
        <div className="flex gap-4 mt-4">
          <a
            href="/products"
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
    </div>
  );
}
