"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/admin/rich-text-editor";

interface Props {
  productId?: string; // undefined = new product
}

interface Category { id: string; name: string; slug: string; }
interface Brand { id: string; name: string; slug: string; }

interface Variant {
  id?: string; name: string; sku: string; price: number;
  stock: number; lowStock: number; image: string; sortOrder: number;
}

interface Image { id?: string; url: string; alt: string; sortOrder: number; }

export default function ProductForm({ productId }: Props) {
  const router = useRouter();
  const isNew = !productId;

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [weight, setWeight] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  // Fetch categories and brands
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/products?limit=1").then(async (res) => {
      if (cancelled) return;
      const json = await res.json();
      if (json.filters) {
        setCategories(json.filters.categories);
        setBrands(json.filters.brands);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Fetch product data if editing
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    fetch(`/api/admin/products/${productId}`).then(async (res) => {
      if (cancelled) return;
      if (!res.ok) return;
      const p = await res.json();
      setTitle(p.title); setSlug(p.slug); setIdentifier(p.identifier || "");
      setDescription(p.description || ""); setContent(p.content || "");
      setBasePrice(String(p.basePrice)); setCompareAtPrice(String(p.compareAtPrice || ""));
      setCostPrice(String(p.costPrice || "")); setSku(p.sku || ""); setBarcode(p.barcode || "");
      setWeight(String(p.weight || ""));
      setSeoTitle(p.seoTitle || ""); setSeoDescription(p.seoDescription || "");
      setPublished(p.published); setFeatured(p.featured);
      setCategoryId(p.categoryId || ""); setBrandId(p.brandId || "");
      setImages(p.images || []); setVariants(p.variants || []);
    });
    return () => { cancelled = true; };
  }, [productId]);

  // Auto-generate slug from title
  const updateTitle = (v: string) => {
    setTitle(v);
    if (autoSlug) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  // Duplicate product
  const handleDuplicate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier, title: `${title} (copia)`, slug: `${slug}-copia`,
          description, content, basePrice: parseFloat(basePrice),
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          sku: sku ? `${sku}-COPY` : null, barcode, weight: weight ? parseFloat(weight) : null,
          seoTitle, seoDescription, published: false, featured: false,
          categoryId: categoryId || null, brandId: brandId || null,
        }),
      });
      const json = await res.json();
      if (json.success) router.push(`/admin/products/${json.id}`);
      else setError(json.error ?? "Errore durante la duplicazione.");
    } catch { setError("Errore di connessione."); }
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!title.trim()) { setError("Il titolo è obbligatorio."); return; }
    if (!basePrice || isNaN(Number(basePrice))) { setError("Prezzo base non valido."); return; }
    setSaving(true);

    const body = {
      identifier: identifier || undefined,
      title: title.trim(), slug: slug || undefined,
      description, content,
      basePrice: parseFloat(basePrice),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      sku: sku || null, barcode: barcode || null,
      weight: weight ? parseFloat(weight) : null,
      seoTitle: seoTitle || null, seoDescription: seoDescription || null,
      published, featured,
      categoryId: categoryId || null, brandId: brandId || null,
    };

    try {
      if (isNew) {
        const res = await fetch("/api/admin/products", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) router.push(`/admin/products/${json.id}`);
        else setError(json.error ?? "Errore durante la creazione.");
      } else {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) setSuccess("Prodotto salvato!");
        else setError(json.error ?? "Errore durante il salvataggio.");
      }
    } catch { setError("Errore di connessione."); }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Nuovo prodotto" : "Modifica prodotto"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isNew ? "Inserisci i dati del nuovo prodotto" : `ID: ${productId}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <button type="button" onClick={handleDuplicate} disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Duplica
            </button>
          )}
          <button type="submit" disabled={saving}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Salvataggio..." : isNew ? "Crea prodotto" : "Salva modifiche"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600">{success}</div>}

      <div className="grid gap-8 xl:grid-cols-3">
        {/* Left: Main info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Basic info */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Informazioni di base</h2>
            <div>
              <label htmlFor="prod-title" className="block text-sm font-medium mb-1">Titolo *</label>
              <input id="prod-title" type="text" value={title} onChange={(e) => updateTitle(e.target.value)}
                required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prod-slug" className="block text-sm font-medium mb-1">Slug</label>
                <div className="flex gap-2">
                  <input id="prod-slug" type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                  <button type="button" onClick={() => { setAutoSlug(true); updateTitle(title); }}
                    className="rounded-md border border-border px-2 text-xs hover:bg-muted transition-colors" title="Auto-genera">↻</button>
                </div>
              </div>
              <div>
                <label htmlFor="prod-identifier" className="block text-sm font-medium mb-1">Identificativo</label>
                <input id="prod-identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
            <div>
              <label htmlFor="prod-desc" className="block text-sm font-medium mb-1">Descrizione breve</label>
              <textarea id="prod-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <p className="block text-sm font-medium mb-1">Descrizione dettagliata</p>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Scrivi qui la descrizione dettagliata del prodotto..."
                minHeight={350}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Formatta il contenuto con grassetti, elenchi, tabelle, immagini e link. Il font rimane sempre quello del sito.
              </p>
            </div>
          </section>

          {/* Pricing */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Prezzi</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="prod-price" className="block text-sm font-medium mb-1">Prezzo base (€) *</label>
                <input id="prod-price" type="number" step="0.01" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                  required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div>
                <label htmlFor="prod-sale" className="block text-sm font-medium mb-1">Prezzo in offerta (€)</label>
                <input id="prod-sale" type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div>
                <label htmlFor="prod-cost" className="block text-sm font-medium mb-1">Prezzo di costo (€)</label>
                <input id="prod-cost" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
          </section>

          {/* Inventory */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Inventario e logistica</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="prod-sku" className="block text-sm font-medium mb-1">SKU</label>
                <input id="prod-sku" type="text" value={sku} onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div>
                <label htmlFor="prod-barcode" className="block text-sm font-medium mb-1">EAN / Codice a barre</label>
                <input id="prod-barcode" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div>
                <label htmlFor="prod-weight" className="block text-sm font-medium mb-1">Peso (kg)</label>
                <input id="prod-weight" type="number" step="0.01" min="0" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Immagini</h2>
            {/* Add image form */}
            <div className="flex gap-2">
              <input type="text" placeholder="URL immagine" value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              <input type="text" placeholder="Testo alternativo (alt)" value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              <button type="button" onClick={async () => {
                if (!imageUrl || !productId) return;
                const res = await fetch("/api/admin/upload", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: imageUrl, alt: imageAlt, productId }),
                });
                const json = await res.json();
                if (json.success) {
                  setImages(prev => [...prev, json.image]);
                  setImageUrl(""); setImageAlt("");
                }
              }} disabled={!imageUrl || isNew}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Aggiungi
              </button>
            </div>
            {isNew && <p className="text-xs text-muted-foreground">Salva prima il prodotto per poter aggiungere immagini.</p>}
            {/* Image list */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={img.id || i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt || ""} className="h-24 w-24 rounded-md border object-cover" />
                    <button type="button" onClick={async () => {
                      if (img.id) await fetch(`/api/admin/upload?id=${img.id}`, { method: "DELETE" });
                      setImages(prev => prev.filter((_, idx) => idx !== i));
                    }}
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Variants */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Varianti</h2>
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna variante. Il prodotto avrà una variante predefinita.</p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={i} className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-3">
                    <input value={v.name} onChange={(e) => {
                      const next = [...variants]; next[i] = { ...next[i], name: e.target.value }; setVariants(next);
                    }} placeholder="Nome variante" className="w-32 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                    <input type="number" value={v.price} onChange={(e) => {
                      const next = [...variants]; next[i] = { ...next[i], price: Number(e.target.value) }; setVariants(next);
                    }} placeholder="Prezzo" step="0.01" className="w-24 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                    <input type="number" value={v.stock} onChange={(e) => {
                      const next = [...variants]; next[i] = { ...next[i], stock: Number(e.target.value) }; setVariants(next);
                    }} placeholder="Stock" className="w-20 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                    <input value={v.sku} onChange={(e) => {
                      const next = [...variants]; next[i] = { ...next[i], sku: e.target.value }; setVariants(next);
                    }} placeholder="SKU" className="w-28 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                    <button type="button" onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-destructive text-xs hover:underline">Rimuovi</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setVariants(prev => [...prev, { name: "", sku: "", price: 0, stock: 0, lowStock: 5, image: "", sortOrder: prev.length }])}
              className="text-sm text-primary hover:underline">
              + Aggiungi variante
            </button>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Stato</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-border" />
              Pubblicato (visibile nel catalogo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-border" />
              In evidenza (mostrato in homepage)
            </label>
          </section>

          {/* Organization */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Organizzazione</h2>
            <div>
              <label htmlFor="prod-cat" className="block text-sm font-medium mb-1">Categoria</label>
              <select id="prod-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Nessuna categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="prod-brand" className="block text-sm font-medium mb-1">Marca</label>
              <select id="prod-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Nessuna marca</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </section>

          {/* SEO */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">SEO</h2>
            <div>
              <label htmlFor="prod-seo-title" className="block text-sm font-medium mb-1">Meta Title</label>
              <input id="prod-seo-title" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="prod-seo-desc" className="block text-sm font-medium mb-1">Meta Description</label>
              <textarea id="prod-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
