import { getProductList } from "@/db/queries";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";
import { ProductFilters } from "@/components/shop/product-filters";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Prodotti — Infograf Store",
  description:
    "Scopri il nostro catalogo di computer, componenti, periferiche e accessori. Dal 1992 a Palermo.",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    brand?: string;
    sort?: string;
    page?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;

  const data = await getProductList({
    search: resolved.search?.trim() || "",
    category: resolved.category?.trim() || "",
    brand: resolved.brand?.trim() || "",
    minPrice: resolved.f_price_min ? Number(resolved.f_price_min) : undefined,
    maxPrice: resolved.f_price_max ? Number(resolved.f_price_max) : undefined,
    sort: resolved.sort?.trim() || "newest",
    page: Math.max(1, Number(resolved.page) || 1),
    limit: 12,
  });

  const currentSearch = resolved.search?.trim() || "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 animate-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catalogo Prodotti</h1>
            <p className="mt-2 text-muted-foreground">
              {data.pagination.total} prodotti trovati
              {currentSearch && <> per &quot;{currentSearch}&quot;</>}
            </p>
          </div>
          <SearchBar initialValue={currentSearch} />
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <ProductFilters
          categorySlug={resolved.category?.trim() || undefined}
          currentSearch={currentSearch}
        />

        <MobileFilters />

        <div className="flex-1">
          {data.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">Nessun prodotto trovato</h2>
              <p className="text-muted-foreground max-w-md">
                Prova a modificare i filtri o la ricerca per trovare quello che cerchi.
              </p>
            </div>
          ) : (
            <>
              <section aria-labelledby="products-heading">
                <h2 id="products-heading" className="sr-only">
                  Prodotti in vendita
                </h2>
                <p className="sr-only" role="status">
                  {data.pagination.total} prodotti trovati
                </p>
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {data.products.map((product, i) => (
                    <li key={product.id}>
                      <ProductCard key={product.id} product={product as ProductCardData} priority={i < 6} />
                    </li>
                  ))}
                </ul>
              </section>

              {data.pagination.totalPages > 1 && (
                <Pagination
                  currentPage={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function SearchBar({ initialValue }: { initialValue: string }) {
  return (
    <form action="/products" method="GET" className="flex w-full sm:w-72" role="search">
      <label htmlFor="search-products" className="sr-only">Cerca prodotti</label>
      <input
        id="search-products"
        type="search"
        name="search"
        defaultValue={initialValue}
        placeholder="Cerca prodotti..."
        autoComplete="off"
        className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        aria-label="Cerca"
        className="ml-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </form>
  );
}

function MobileFilters() {
  return (
    <div className="lg:hidden">
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Filtri
        </summary>
        <div className="mt-3">
          <ProductFilters categorySlug={undefined} />
        </div>
      </details>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-1">
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-2 text-muted-foreground">...</span>
        ) : (
          <a
            key={p}
            href={`/products?page=${p}`}
            className={
              p === currentPage
                ? "flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
                : "flex h-9 w-9 items-center justify-center rounded-md text-sm text-foreground transition-colors hover:bg-muted"
            }
          >
            {p}
          </a>
        ),
      )}
    </nav>
  );
}
