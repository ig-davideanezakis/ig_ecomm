"use client";

import { useState, useEffect, useCallback } from "react";

interface FilterOption {
  id: string;
  value: string;
  label: string | null;
}

interface FilterDef {
  id: string;
  name: string;
  value_mode: "auto" | "manual";
  show_as_chip: boolean;
  use_as_filter: boolean;
  options: FilterOption[];
}

interface ProductFilterValue {
  filterId: string;
  value: string;
  isOverride: boolean;
}

/**
 * Per-product editor for the unified filter/chip system (see
 * src/lib/filter-values.ts). Shows every filter relevant to this product
 * (useAsFilter or showAsChip) with its current value:
 * - "auto" filters: the value derived from the product's specifications,
 *   editable as a manual override (which survives a later re-derivation
 *   until reset), with a "Ricalcola" button to drop the override.
 * - "manual" filters: a direct assignment, picked from the filter's
 *   curated option list when one exists, free text otherwise.
 */
export function ProductFilterValuesEditor({ productId }: { productId: string }) {
  const [filters, setFilters] = useState<FilterDef[] | null>(null);
  const [values, setValues] = useState<Record<string, ProductFilterValue>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [filtersRes, productRes] = await Promise.all([
      fetch("/api/admin/filters"),
      fetch(`/api/admin/products/${productId}`),
    ]);
    const filtersJson: FilterDef[] = await filtersRes.json();
    const productJson = await productRes.json();

    const relevant = filtersJson.filter((f) => f.use_as_filter || f.show_as_chip);
    setFilters(relevant);

    const map: Record<string, ProductFilterValue> = {};
    for (const v of (productJson.filterValues || []) as ProductFilterValue[]) map[v.filterId] = v;
    setValues(map);
    setDrafts(Object.fromEntries(relevant.map((f) => [f.id, map[f.id]?.value ?? ""])));
  }, [productId]);

  useEffect(() => {
    // setTimeout defers load()'s setState calls past this render, avoiding
    // the "synchronous setState within an effect" cascading-render lint rule.
    const id = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const save = async (filterId: string) => {
    setBusy((b) => ({ ...b, [filterId]: true }));
    await fetch(`/api/admin/products/${productId}/filter-values`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filterId, value: drafts[filterId] ?? "" }),
    });
    await load();
    setBusy((b) => ({ ...b, [filterId]: false }));
  };

  const reset = async (filterId: string) => {
    setBusy((b) => ({ ...b, [filterId]: true }));
    await fetch(`/api/admin/products/${productId}/filter-values`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filterId, reset: true }),
    });
    await load();
    setBusy((b) => ({ ...b, [filterId]: false }));
  };

  if (filters === null) {
    return <p className="text-sm text-muted-foreground">Caricamento attributi...</p>;
  }
  if (filters.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun attributo configurato — vai su Filtri per crearne uno.</p>;
  }

  return (
    <div className="space-y-2">
      {filters.map((f) => {
        const current = values[f.id];
        const draft = drafts[f.id] ?? "";
        const changed = draft !== (current?.value ?? "");

        return (
          <div key={f.id} className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
            <div className="min-w-[9rem]">
              <p className="text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.value_mode === "auto" ? "Automatico da specifiche" : "Manuale"}
                {current?.isOverride && " · corretto a mano"}
              </p>
            </div>

            {f.value_mode === "manual" && f.options.length > 0 ? (
              <select
                aria-label={`Valore per ${f.name}`}
                value={draft}
                onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o.id} value={o.value}>{o.label || o.value}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                aria-label={`Valore per ${f.name}`}
                value={draft}
                onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                placeholder={f.value_mode === "auto" ? "Derivato dalle specifiche" : "Valore"}
                className="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            )}

            <button
              type="button"
              onClick={() => save(f.id)}
              disabled={busy[f.id] || !changed}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Salva
            </button>
            {f.value_mode === "auto" && (
              <button
                type="button"
                onClick={() => reset(f.id)}
                disabled={busy[f.id]}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              >
                Ricalcola
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
