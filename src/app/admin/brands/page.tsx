"use client";

import { useState, useEffect } from "react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  show_in_home: boolean;
  show_in_footer: boolean;
  productCount: number;
  created_at: string;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", logo: "", description: "", website: "", showInHome: false, showInFooter: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchBrands = () => fetch("/api/admin/brands").then(r => r.json()).then(setBrands);

  useEffect(() => {
    fetch("/api/admin/brands").then(r => r.json()).then(d => { setBrands(d); setLoading(false); });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/admin/brands/${editingId}` : "/api/admin/brands";
    const body: Record<string, string | boolean | undefined> = { name: form.name, slug: form.slug };
    if (form.logo) body.logo = form.logo;
    if (form.description) body.description = form.description;
    if (form.website) body.website = form.website;
    body.showInHome = form.showInHome;
    body.showInFooter = form.showInFooter;
    if (editingId) body.newSlug = form.slug;

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.success) {
      setShowForm(false); setEditingId(null);
      setForm({ name: "", slug: "", logo: "", description: "", website: "", showInHome: false, showInFooter: false });
      fetchBrands();
    } else setError(json.error || "Errore");
    setSaving(false);
  };

  const handleDelete = async (slug: string, name: string) => {
    if (!confirm(`Eliminare "${name}"? I prodotti collegati perderanno la marca.`)) return;
    const res = await fetch(`/api/admin/brands/${slug}`, { method: "DELETE" });
    if (res.ok) fetchBrands();
    else { const j = await res.json(); setError(j.error || "Errore"); }
  };

  const startEdit = (b: Brand) => {
    setForm({ name: b.name, slug: b.slug, logo: b.logo || "", description: b.description || "", website: b.website || "", showInHome: b.show_in_home, showInFooter: b.show_in_footer });
    setEditingId(b.slug);
    setShowForm(true);
    setAutoSlug(false);
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Marche</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", slug: "", logo: "", description: "", website: "", showInHome: false, showInFooter: false }); setAutoSlug(true); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          {showForm ? "Annulla" : "+ Nuova marca"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handleSave} className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{editingId ? "Modifica marca" : "Nuova marca"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="b-name" className="block text-sm font-medium mb-1">Nome *</label>
              <input id="b-name" value={form.name} onChange={e => {
                setForm({ ...form, name: e.target.value });
                if (autoSlug && !editingId) setForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
              }} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="b-slug" className="block text-sm font-medium mb-1">Slug</label>
              <div className="flex gap-2">
                <input id="b-slug" value={form.slug} onChange={e => { setForm({ ...form, slug: e.target.value }); setAutoSlug(false); }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                <button type="button" onClick={() => { setAutoSlug(true); setForm(p => ({ ...p, slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })); }}
                  className="rounded-md border border-border px-2 text-xs hover:bg-muted" title="Auto-genera">↻</button>
              </div>
            </div>
            <div>
              <label htmlFor="b-logo" className="block text-sm font-medium mb-1">URL logo</label>
              <input id="b-logo" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })}
                placeholder="https://..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              {form.logo && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={form.logo} alt="anteprima" className="h-10 w-auto rounded border bg-white dark:bg-black p-1" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className="text-xs text-muted-foreground">Anteprima</span>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="b-website" className="block text-sm font-medium mb-1">Sito web</label>
              <input id="b-website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                placeholder="https://www.example.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showInHome} onChange={e => setForm({ ...form, showInHome: e.target.checked })}
                className="rounded border-border text-primary" />
              Mostra in homepage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showInFooter} onChange={e => setForm({ ...form, showInFooter: e.target.checked })}
                className="rounded border-border text-primary" />
              Mostra nel footer
            </label>
          </div>
          <div>
            <label htmlFor="b-desc" className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea id="b-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <button type="submit" disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea marca"}
          </button>
        </form>
      )}

      {/* Brands grid */}
      {brands.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nessuna marca ancora.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map(b => (
            <div key={b.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="h-10 w-auto rounded bg-white dark:bg-black p-1 border" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-lg font-bold text-muted-foreground">
                      {b.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.productCount} prodotti</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(b)} className="text-xs text-muted-foreground hover:text-foreground">Modifica</button>
                  <button onClick={() => handleDelete(b.slug, b.name)} className="text-xs text-destructive hover:underline">Elimina</button>
                </div>
              </div>
              {b.description && <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>}
              {b.website && (
                <a href={b.website} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-primary hover:underline truncate">{b.website}</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
