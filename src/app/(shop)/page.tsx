"use client";

import { useState, useEffect } from "react";
import { BrandLogoWidget } from "@/components/shop/brand-logo-widget";

export default function Home() {
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(s => {
        if (s.show_brand_widget_home !== undefined) {
          setWidgetEnabled(s.show_brand_widget_home === "true");
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <>
      {/* Hero Section */}
      <div className="flex flex-col flex-1 items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-lg py-24">
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

      {/* Brand Logos */}
      {loaded && widgetEnabled && (
        <BrandLogoWidget variant="carousel" title="I nostri brand" limit={10} location="home" />
      )}
    </>
  );
}
