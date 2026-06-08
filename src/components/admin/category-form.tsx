"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/admin/rich-text-editor";
import type { TreeNode } from "@/lib/schemas";

interface Props { categoryId?: string }

export default function CategoryForm({ categoryId }: Props) {
  const router = useRouter();
  const isNew = !categoryId;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [icon, setIcon] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    fetch("/api/admin/categories").then(async r => {
      const json = await r.json();
      setCategories(json.tree || []);
    });
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    fetch(`/api/admin/categories/${categoryId}`).then(async r => {
      if (!r.ok) return;
      const c = await r.json();
      setName(c.name); setSlug(c.slug); setDescription(c.description || "");
      setImage(c.image || ""); setIcon(c.icon || "");
      setParentId(c.parent_id || ""); setSortOrder(c.sort_order || 0);
      setSeoTitle(c.seo_title || ""); setSeoDescription(c.seo_description || "");
      setNoindex(c.noindex || false); setIsActive(c.is_active ?? true);
      setActiveFrom(c.active_from ? c.active_from.slice(0, 16) : "");
      setActiveUntil(c.active_until ? c.active_until.slice(0, 16) : "");
    });
  }, [categoryId]);

  const updateName = (v: string) => {
    setName(v);
    if (autoSlug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const [categories, setCategories] = useState<TreeNode[]>([]);
  const flattenOptions = (nodes: TreeNode[], depth = 0): { id: string; name: string; depth: number }[] => {
    const result: { id: string; name: string; depth: number }[] = [];
    for (const n of nodes) {
      if (n.id === categoryId) continue;
      result.push({ id: n.id, name: n.name, depth });
      result.push(...flattenOptions(n.children || [], depth + 1));
    }
    return result;
  };
  const parentOptions = flattenOptions(categories, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!name.trim()) { setError("Il nome è obbligatorio."); return; }
    setSaving(true);

    const body = {
      name: name.trim(), slug: slug.trim() || undefined,
      description, image: image || null, icon: icon || null,
      parentId: parentId || null, sortOrder,
      seoTitle: seoTitle || null, seoDescription: seoDescription || null,
      noindex, isActive,
      activeFrom: activeFrom || null, activeUntil: activeUntil || null,
    };

    try {
      if (isNew) {
        const res = await fetch("/api/admin/categories", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) router.push(`/admin/categories/${json.id}`);
        else setError(json.error ?? "Errore.");
      } else {
        const res = await fetch(`/api/admin/categories/${categoryId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) { setSuccess("Categoria salvata!"); setTimeout(() => setSuccess(""), 3000); }
        else setError(json.error ?? "Errore.");
      }
    } catch { setError("Errore di connessione."); }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Nuova categoria" : "Modifica categoria"}</h1>
        <button type="submit" disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {saving ? "Salvataggio..." : isNew ? "Crea categoria" : "Salva modifiche"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600">{success}</div>}

      <div className="grid gap-8 xl:grid-cols-3">
        {/* Main */}
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Informazioni di base</h2>
            <div>
              <label htmlFor="cat-name" className="block text-sm font-medium mb-1">Nome *</label>
              <input id="cat-name" value={name} onChange={(e) => updateName(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cat-slug" className="block text-sm font-medium mb-1">Slug</label>
                <div className="flex gap-2">
                  <input id="cat-slug" value={slug} onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                  <button type="button" onClick={() => { setAutoSlug(true); updateName(name); }}
                    className="rounded-md border border-border px-2 text-xs hover:bg-muted" title="Auto-genera">↻</button>
                </div>
              </div>
              <div>
                <label htmlFor="cat-parent" className="block text-sm font-medium mb-1">Categoria padre</label>
                <select id="cat-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Nessuna (radice)</option>
                  {parentOptions.map(o => (
                    <option key={o.id} value={o.id}>
                      {"—".repeat(o.depth)} {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className="block text-sm font-medium mb-1">Descrizione (per SEO)</p>
              <RichTextEditor value={description} onChange={setDescription} minHeight={200} placeholder="Descrizione della categoria..." />
            </div>
          </section>

          {/* Media */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Media</h2>
            <div>
              <label htmlFor="cat-image" className="block text-sm font-medium mb-1">URL immagine di copertina</label>
              <input id="cat-image" value={image} onChange={(e) => setImage(e.target.value)}
                placeholder="https://..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="cat-icon" className="block text-sm font-medium mb-1">Icona (URL o emoji)</label>
              <input id="cat-icon" value={icon} onChange={(e) => setIcon(e.target.value)}
                placeholder="🖥️ o https://..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Stato e visibilità</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-border" />
              Attiva (visibile nel catalogo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} className="rounded border-border" />
              No index (nascondi dai motori di ricerca)
            </label>
            <div>
              <label htmlFor="cat-from" className="block text-xs font-medium mb-1">Attiva dal</label>
              <input id="cat-from" type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="cat-until" className="block text-xs font-medium mb-1">Attiva fino al</label>
              <input id="cat-until" type="datetime-local" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="cat-order" className="block text-xs font-medium mb-1">Ordine</label>
              <input id="cat-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </section>

          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">SEO</h2>
            <div>
              <label htmlFor="cat-seo-title" className="block text-sm font-medium mb-1">Meta Title</label>
              <input id="cat-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="cat-seo-desc" className="block text-sm font-medium mb-1">Meta Description</label>
              <textarea id="cat-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
