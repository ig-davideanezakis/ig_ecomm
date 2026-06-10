"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface BrandLogo {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  productCount: number;
}

interface BrandLogoWidgetProps {
  variant?: "grid" | "carousel";
  title?: string;
  limit?: number;
}

export function BrandLogoWidget({
  variant = "grid",
  title = "I nostri brand",
  limit = 12,
}: BrandLogoWidgetProps) {
  const [brands, setBrands] = useState<BrandLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then(r => r.json())
      .then(d => { setBrands(d.slice(0, limit)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [limit]);

  if (loading) return <div className="h-20 animate-pulse rounded-lg bg-muted" />;
  if (brands.length === 0) return null;

  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  if (variant === "carousel") {
    return (
      <section className="py-12">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">{title}</h2>
        <div className="relative">
          <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 rounded-full p-2 hover:bg-muted shadow">&larr;</button>
          <div ref={scrollRef} className="flex gap-6 overflow-x-auto scrollbar-hide px-8 py-4 snap-x">
            {brands.map(b => (
              <Link key={b.id} href={`/brand/${b.slug}`}
                className="flex shrink-0 items-center justify-center snap-start">
                <div className="flex h-16 w-32 items-center justify-center rounded-lg border bg-white dark:bg-black p-3 transition-all hover:shadow-md hover:scale-105">
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{b.name}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 rounded-full p-2 hover:bg-muted shadow">&rarr;</button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6">
        {brands.map(b => (
          <Link key={b.id} href={`/brand/${b.slug}`}
            className="flex h-16 w-36 items-center justify-center rounded-lg border bg-white dark:bg-black p-3 transition-all hover:shadow-md hover:scale-105">
            {b.logo ? (
              <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{b.name}</span>
            )}
          </Link>
        ))}
      </div>
      {brands.length >= limit && (
        <div className="mt-6 text-center">
          <Link href="/brands" className="text-sm text-primary hover:underline">Vedi tutti i brand &rarr;</Link>
        </div>
      )}
    </section>
  );
}
