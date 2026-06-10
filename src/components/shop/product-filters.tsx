"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";

interface FilterOption {
  id: string;
  value: string;
  label: string | null;
  slug: string | null;
  color: string | null;
}

interface FilterData {
  id: string;
  name: string;
  slug: string;
  type: string;
  options: FilterOption[];
  source: "global" | "inherited" | "direct";
}

interface ProductFiltersProps {
  categorySlug?: string;
  currentSearch?: string;
}

export function ProductFilters({ categorySlug, currentSearch }: ProductFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterData[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive active filters from URL search params
  const activeFilters = useMemo(() => {
    const active: Record<string, string[]> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("f_")) {
        const filterKey = key.slice(2);
        if (!active[filterKey]) active[filterKey] = [];
        active[filterKey].push(value);
      }
    }
    return active;
  }, [searchParams]);

  // Load dynamic filters from API
  useEffect(() => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("categorySlug", categorySlug);
    fetch(`/api/category-filters?${params}`)
      .then(r => r.json())
      .then(json => { setFilters(json.filters || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [categorySlug]);

  const buildUrl = useCallback((newFilters: Record<string, string[]>) => {
    const params = new URLSearchParams();

    // Keep existing search params that aren't filter-related
    for (const [key, value] of searchParams.entries()) {
      if (!key.startsWith("f_") && key !== "page") {
        params.set(key, value);
      }
    }

    // Add current search
    if (currentSearch) params.set("search", currentSearch);

    // Add filter params
    for (const [key, values] of Object.entries(newFilters)) {
      for (const v of values) {
        params.append(`f_${key}`, v);
      }
    }

    params.set("page", "1");
    return `${pathname}?${params.toString()}`;
  }, [searchParams, pathname, currentSearch]);

  const toggleFilter = (filterSlug: string, value: string) => {
    const current = activeFilters[filterSlug] || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];

    const newFilters = { ...activeFilters };
    if (next.length === 0) {
      delete newFilters[filterSlug];
    } else {
      newFilters[filterSlug] = next;
    }

    router.push(buildUrl(newFilters));
  };

  const clearFilters = () => {
    router.push(buildUrl({}));
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  if (loading) return <div className="text-sm text-muted-foreground py-4">Caricamento filtri...</div>;
  if (filters.length === 0) return null;

  const sourceLabel = (source: string) => {
    if (source === "global") return "Sempre disponibile";
    if (source === "inherited") return "Ereditato";
    return "";
  };

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtri</h2>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-primary hover:underline">
            Cancella filtri
          </button>
        )}
      </div>

      {filters.map(filter => (
        <div key={filter.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{filter.name}</h3>
            {filter.source !== "global" && (
              <span className="text-[10px] text-muted-foreground italic">{sourceLabel(filter.source)}</span>
            )}
          </div>

          {/* Checkbox type (multi-select) */}
          {(filter.type === "checkbox" || filter.type === "color") && (
            <div className="space-y-1.5">
              {filter.options.map(opt => {
                const isActive = (activeFilters[filter.slug] || []).includes(opt.value);
                return (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer group">
                    {filter.type === "color" && opt.color ? (
                      <>
                        <span
                          className={`inline-block h-5 w-5 rounded-full border-2 ${
                            isActive ? "border-primary ring-2 ring-primary/30" : "border-border"
                          }`}
                          style={{ backgroundColor: opt.color }}
                          onClick={() => toggleFilter(filter.slug, opt.value)}
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {opt.label || opt.value}
                        </span>
                      </>
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleFilter(filter.slug, opt.value)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {opt.label || opt.value}
                        </span>
                      </>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {/* Range type */}
          {filter.type === "range" && (
            <RangeFilter
              min={parseInt(searchParams.get(`f_${filter.slug}_min`) || "0")}
              max={parseInt(searchParams.get(`f_${filter.slug}_max`) || "5000")}
              onApply={(min, max) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set(`f_${filter.slug}_min`, String(min));
                params.set(`f_${filter.slug}_max`, String(max));
                params.set("page", "1");
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
          )}

          {/* Select type */}
          {filter.type === "select" && (
            <select
              value={(activeFilters[filter.slug] || [])[0] || ""}
              onChange={e => {
                const val = e.target.value;
                const newFilters = { ...activeFilters };
                if (val) {
                  newFilters[filter.slug] = [val];
                } else {
                  delete newFilters[filter.slug];
                }
                router.push(buildUrl(newFilters));
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Tutti</option>
              {filter.options.map(opt => (
                <option key={opt.id} value={opt.value}>{opt.label || opt.value}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </aside>
  );
}

function RangeFilter({
  min,
  max,
  onApply,
}: {
  min: number;
  max: number;
  onApply: (min: number, max: number) => void;
}) {
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <input
          type="number"
          value={localMin}
          onChange={e => setLocalMin(Number(e.target.value))}
          placeholder="Min"
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
        <span className="text-muted-foreground">—</span>
        <input
          type="number"
          value={localMax}
          onChange={e => setLocalMax(Number(e.target.value))}
          placeholder="Max"
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
        <button
          onClick={() => onApply(localMin, localMax)}
          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
        >
          Vai
        </button>
      </div>
    </div>
  );
}
