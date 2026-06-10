"use client";

import { useState, useEffect } from "react";

interface FilterOption {
  id: string;
  value: string;
  label: string | null;
  slug: string | null;
  color: string | null;
  sort_order: number;
}

interface Filter {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_global: boolean;
  sort_order: number;
  options: FilterOption[];
}

export default function AdminFiltersPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", type: "checkbox", isGlobal: false, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [optionForms, setOptionForms] = useState<Record<string, { value: string; label: string; slug: string }>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/filters")
      .then(r => r.json())
      .then(data => { setFilters(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/admin/filters/${editingId}` : "/api/admin/filters";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.success) { setShowForm(false); setEditingId(null); setForm({ name: "", slug: "", type: "checkbox", isGlobal: false, sortOrder: 0 }); fetch("/api/admin/filters").then(r => r.json()).then(setFilters); }
    else setError(json.error || "Errore");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo filtro e tutte le sue opzioni?")) return;
    await fetch(`/api/admin/filters/${id}`, { method: "DELETE" });
    fetch("/api/admin/filters").then(r => r.json()).then(setFilters);
  };

  const addOption = async (filterId: string) => {
    const of = optionForms[filterId];
    if (!of?.value) return;
    const res = await fetch(`/api/admin/filters/${filterId}/options`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(of),
    });
    if (res.ok) {
      setOptionForms({ ...optionForms, [filterId]: { value: "", label: "", slug: "" } });
      fetch("/api/admin/filters").then(r => r.json()).then(setFilters);
    }
  };

  const deleteOption = async (filterId: string, optionId: string) => {
    await fetch(`/api/admin/filters/${filterId}/options/${optionId}`, { method: "DELETE" });
    fetch("/api/admin/filters").then(r => r.json()).then(setFilters);
  };

  const editFilter = (f: Filter) => {
    setForm({ name: f.name, slug: f.slug, type: f.type, isGlobal: f.is_global, sortOrder: f.sort_order });
    setEditingId(f.id);
    setShowForm(true);
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Filtri</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", slug: "", type: "checkbox", isGlobal: false, sortOrder: 0 }); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          {showForm ? "Annulla" : "+ Nuovo filtro"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handleSave} className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{editingId ? "Modifica filtro" : "Nuovo filtro"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="f-name" className="block text-sm font-medium mb-1">Nome *</label>
              <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (!editingId) setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })); }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" required />
            </div>
            <div>
              <label htmlFor="f-slug" className="block text-sm font-medium mb-1">Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="f-type" className="block text-sm font-medium mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
                <option value="checkbox">Checkbox (multi-select)</option>
                <option value="select">Select (singolo)</option>
                <option value="range">Range (prezzo)</option>
                <option value="color">Colore (swatch)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isGlobal} onChange={e => setForm({ ...form, isGlobal: e.target.checked })}
                className="rounded border-border" />
              Filtro globale (attivo su tutte le categorie)
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="f-order" className="text-sm">Ordine:</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea filtro"}
          </button>
        </form>
      )}

      {/* Filters list */}
      <div className="space-y-4">
        {filters.map(f => (
          <div key={f.id} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
              onClick={() => setCollapsed({ ...collapsed, [f.id]: !collapsed[f.id] })}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{collapsed[f.id] ? "▶" : "▼"}</span>
                <div>
                  <span className="font-medium">{f.name}</span>
                  {f.is_global && <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">Globale</span>}
                  <span className="ml-2 text-xs text-muted-foreground">slug: {f.slug}</span>
                  <span className="ml-2 text-xs text-muted-foreground">tipo: {f.type}</span>
                </div>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => editFilter(f)} className="text-xs text-muted-foreground hover:text-foreground">Modifica</button>
                <button onClick={() => handleDelete(f.id)} className="text-xs text-destructive hover:underline">Elimina</button>
              </div>
            </div>

            {!collapsed[f.id] && (
              <div className="border-t px-4 py-3 space-y-3">
                {/* Options list */}
                <div className="flex flex-wrap gap-2">
                  {f.options.map(o => (
                    <div key={o.id} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1 text-xs">
                      {o.color && <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: o.color }} />}
                      {o.label || o.value}
                      <button onClick={() => deleteOption(f.id, o.id)} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                    </div>
                  ))}
                  {f.options.length === 0 && <span className="text-xs text-muted-foreground">Nessuna opzione</span>}
                </div>

                {/* Add option form */}
                <div className="flex gap-2 items-end">
                  <div>
                    <label htmlFor="fo-value" className="block text-[10px] text-muted-foreground mb-0.5">Valore</label>
                    <input value={optionForms[f.id]?.value || ""} onChange={e => setOptionForms({ ...optionForms, [f.id]: { ...optionForms[f.id], value: e.target.value, label: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") } })}
                      placeholder="es. rosso" className="w-28 rounded border border-input bg-background px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <label htmlFor="fo-label" className="block text-[10px] text-muted-foreground mb-0.5">Etichetta</label>
                    <input value={optionForms[f.id]?.label || ""} onChange={e => setOptionForms({ ...optionForms, [f.id]: { ...optionForms[f.id], label: e.target.value } })}
                      placeholder="Rosso" className="w-28 rounded border border-input bg-background px-2 py-1 text-xs" />
                  </div>
                  <button onClick={() => addOption(f.id)} disabled={!optionForms[f.id]?.value}
                    className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-30">
                    + Aggiungi
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filters.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nessun filtro ancora. Creane uno!</p>}
      </div>
    </div>
  );
}
