"use client";

import { useState, useEffect } from "react";

interface FilterOption {
  id: string;
  value: string;
  label: string | null;
  slug: string | null;
  color: string | null;
}

interface FilterRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_global: boolean;
  options: FilterOption[];
}

interface CategoryFilterInfo {
  id: string;
  filter_id: string;
  filter_name: string;
  filter_slug: string;
  filter_type: string;
  category_id: string;
  category_name: string;
  inherit: boolean;
  source: "global" | "inherited" | "direct";
  options: FilterOption[];
}

export default function CategoryFiltersSection({
  categoryId,
  categoryName,
  parentName,
}: {
  categoryId: string;
  categoryName?: string;
  parentName?: string;
}) {
  const [filters, setFilters] = useState<CategoryFilterInfo[]>([]);
  const [allFilters, setAllFilters] = useState<FilterRow[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [filtersRes, allRes] = await Promise.all([
        fetch(`/api/admin/categories/${categoryId}/filters`),
        fetch("/api/admin/filters"),
      ]);
      setFilters(await filtersRes.json());
      setAllFilters(await allRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [categoryId]);

  // Group filters by source
  const globalFilters = filters.filter(f => f.source === "global");
  const inheritedFilters = filters.filter(f => f.source === "inherited");
  const directFilters = filters.filter(f => f.source === "direct");

  // Available filters to add (not already assigned to this category directly)
  const assignedIds = new Set(directFilters.map(f => f.filter_id));
  const availableFilters = allFilters.filter(f => !assignedIds.has(f.id) && !f.is_global);

  const handleAdd = async () => {
    if (!selectedFilterId) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/filters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterId: selectedFilterId }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Errore"); return; }
      setSelectedFilterId("");
      loadData();
    } catch { setError("Errore di connessione."); }
  };

  const handleRemove = async (filterId: string) => {
    const res = await fetch(`/api/admin/categories/${categoryId}/filters?filterId=${filterId}`, {
      method: "DELETE",
    });
    if (res.ok) loadData();
  };

  const toggleInherit = async (filterId: string, currentInherit: boolean) => {
    const res = await fetch(`/api/admin/categories/${categoryId}/filters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filterId, inherit: !currentInherit }),
    });
    if (res.ok) loadData();
  };

  if (loading) return <div className="text-sm text-muted-foreground py-4">Caricamento filtri...</div>;

  return (
    <section className="rounded-lg border bg-card p-6 space-y-4">
      <h2 className="font-semibold">🔍 Filtri categoria</h2>

      {error && <div className="text-xs text-red-600">{error}</div>}

      {/* Global filters */}
      {globalFilters.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">🔵 Filtri globali (sempre attivi)</p>
          <div className="flex flex-wrap gap-2">
            {globalFilters.map(f => (
              <span key={f.filter_id} className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs">
                {f.filter_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inherited filters */}
      {inheritedFilters.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">🟢 Ereditati da "{parentName || "categoria padre"}"</p>
          <div className="flex flex-wrap gap-2">
            {inheritedFilters.map(f => (
              <span key={f.filter_id} className="inline-flex items-center gap-1 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2.5 py-1 text-xs">
                {f.filter_name}
                <button onClick={() => handleRemove(f.filter_id)} className="text-muted-foreground hover:text-destructive ml-1" title="Rimuovi eredità">&times;</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Direct filters */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">🟣 Filtri specifici di questa categoria</p>
        {directFilters.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {directFilters.map(f => (
              <span key={f.filter_id} className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 px-2.5 py-1 text-xs">
                {f.filter_name}
                <label className="flex items-center gap-1 ml-1 text-[10px]" title="Eredita alle sottocategorie">
                  <input type="checkbox" checked={f.inherit} onChange={() => toggleInherit(f.filter_id, f.inherit)}
                    className="rounded border-border w-3 h-3" />
                  ereditabile
                </label>
                <button onClick={() => handleRemove(f.filter_id)} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-3">Nessun filtro specifico assegnato</p>
        )}

        {/* Add filter */}
        {availableFilters.length > 0 && (
          <div className="flex gap-2">
            <select value={selectedFilterId} onChange={e => setSelectedFilterId(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Aggiungi filtro...</option>
              {availableFilters.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
              ))}
            </select>
            <button type="button" onClick={handleAdd} disabled={!selectedFilterId}
              className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-30">
              + Aggiungi
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
