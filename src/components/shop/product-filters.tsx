"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface FilterCategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface FilterBrand {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface ProductFiltersProps {
  categories: FilterCategory[];
  brands: FilterBrand[];
  className?: string;
}

export function ProductFilters({
  categories,
  brands,
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentSearch = searchParams.get("search") || "";

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset page when filters change
      params.delete("page");
      return params.toString();
    },
    [searchParams],
  );

  const handleCategoryClick = (slug: string) => {
    const next = slug === currentCategory ? null : slug;
    router.push(`${pathname}?${createQueryString({ category: next })}`);
  };

  const handleBrandClick = (slug: string) => {
    const next = slug === currentBrand ? null : slug;
    router.push(`${pathname}?${createQueryString({ brand: next })}`);
  };

  const handlePriceFilter = () => {
    router.push(
      `${pathname}?${createQueryString({
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
      })}`,
    );
  };

  const handleClearAll = () => {
    router.push(pathname);
  };

  const hasActiveFilters = currentCategory || currentBrand || currentMinPrice || currentMaxPrice || currentSearch;

  return (
    <aside className={cn("space-y-6", className)}>
      {/* Active filters summary */}
      {hasActiveFilters && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Filtri attivi</h3>
            <button
              onClick={handleClearAll}
              className="text-xs text-primary hover:underline"
            >
              Cancella tutto
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentCategory && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {categories.find((c) => c.slug === currentCategory)?.name ?? currentCategory}
              </span>
            )}
            {currentBrand && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {brands.find((b) => b.slug === currentBrand)?.name ?? currentBrand}
              </span>
            )}
            {(currentMinPrice || currentMaxPrice) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Prezzo: {currentMinPrice || "0"}–{currentMaxPrice || "∞"}€
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      {currentSearch && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Risultati per: <span className="font-medium text-foreground">&quot;{currentSearch}&quot;</span>
          </p>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Categorie
        </h3>
        <ul className="space-y-1">
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => handleCategoryClick(cat.slug)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                  currentCategory === cat.slug
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground",
                )}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Brands */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Marche
        </h3>
        <ul className="space-y-1">
          {brands.map((brand) => (
            <li key={brand.id}>
              <button
                onClick={() => handleBrandClick(brand.slug)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                  currentBrand === brand.slug
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground",
                )}
              >
                <span>{brand.name}</span>
                <span className="text-xs text-muted-foreground">{brand.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fascia prezzo
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Da"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePriceFilter()}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            min={0}
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            placeholder="A"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePriceFilter()}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            min={0}
          />
        </div>
        <button
          onClick={handlePriceFilter}
          className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Applica
        </button>
      </div>

      {/* Sort */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ordina per
        </h3>
        <SortSelect
          current={searchParams.get("sort") || "newest"}
          onChange={(value) => {
            router.push(`${pathname}?${createQueryString({ sort: value })}`);
          }}
        />
      </div>
    </aside>
  );
}

function SortSelect({
  current,
  onChange,
}: {
  current: string;
  onChange: (value: string) => void;
}) {
  const options = [
    { value: "newest", label: "Più recenti" },
    { value: "price_asc", label: "Prezzo crescente" },
    { value: "price_desc", label: "Prezzo decrescente" },
    { value: "name", label: "Nome A–Z" },
  ];

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
