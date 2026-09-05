"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/admin/rich-text-editor";
import IcecatDialog from "@/components/admin/icecat-dialog";
import SpecificationsView from "@/components/shop/specifications-view";
import { SpecificationsEditor } from "@/components/admin/specifications-editor";
import type { IcecatProductData } from "@/lib/icecat";
import {
  applyIcecatSelection,
  type IcecatFormSnapshot,
  type IcecatSectionId,
} from "@/lib/icecat-form";

interface Props {
  productId?: string; // undefined = new product
  /** Error surfaced after creation when the automatic Icecat import failed. */
  initialImportError?: string;
}

interface Category { id: string; name: string; slug: string; }
interface Brand { id: string; name: string; slug: string; }

interface Variant {
  id?: string; name: string; sku: string; price: number;
  stock: number; lowStock: number; image: string; sortOrder: number;
}

interface Image { id?: string; url: string; alt: string; sortOrder: number; }

export default function ProductForm({ productId, initialImportError }: Props) {
  const router = useRouter();
  const isNew = !productId;

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  /** Marketing/overview rich HTML — rendered in the "Panoramica" product tab. */
  const [overview, setOverview] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  /** GTIN used for the Icecat import — saved on the product so it never has to be searched again. */
  const [icecatCode, setIcecatCode] = useState("");
  const [gtinQuery, setGtinQuery] = useState("");
  /** Import source selector: GTIN (Icecat) vs URL (AI extraction). */
  const [importSource, setImportSource] = useState<"gtin" | "url">("gtin");
  const [urlQuery, setUrlQuery] = useState("");
  /** Manufacturer URL last used for the AI import — saved on the product. */
  const [importUrl, setImportUrl] = useState("");
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
  const [seoLoading, setSeoLoading] = useState(false);
  const [eanLoading, setEanLoading] = useState(false);
  const [eanImages, setEanImages] = useState<Image[]>([]);
  const [importingEanImages, setImportingEanImages] = useState(false);
  const [importError, setImportError] = useState(initialImportError || "");
  const [icecatData, setIcecatData] = useState<IcecatProductData | null>(null);
  const [icecatOpen, setIcecatOpen] = useState(false);

  const uploadFile = async (file: File) => {
    if (!productId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", productId);
    formData.append("alt", imageAlt || file.name);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setImages(prev => [...prev, json.image]);
      }
    } catch {
      // ignore
    }
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
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
      setOverview(p.overview || "");
      setSpecifications(p.specifications || "");
      setBasePrice(String(p.basePrice)); setCompareAtPrice(String(p.compareAtPrice || ""));
      setCostPrice(String(p.costPrice || "")); setSku(p.sku || ""); setBarcode(p.barcode || "");
      setIcecatCode(p.icecatCode || "");
      // Prefill the Icecat search with the code already used for this product
      // (falling back to the EAN), so the data never has to be looked up again.
      setGtinQuery(p.icecatCode || p.barcode || "");
      // Same for the AI URL import: restore the last source URL.
      setImportUrl(p.importUrl || "");
      setUrlQuery(p.importUrl || "");
      setWeight(String(p.weight || ""));
      setSeoTitle(p.seoTitle || ""); setSeoDescription(p.seoDescription || "");
      setPublished(p.published); setFeatured(p.featured);
      setCategoryId(p.categoryId || ""); setBrandId(p.brandId || "");
      setImages(p.images || []); setVariants(p.variants || []);
    });
    return () => { cancelled = true; };
  }, [productId]);

  // Clean the ?importError= query param from the URL once it has been
  // surfaced, so a page reload doesn't show the banner again.
  useEffect(() => {
    if (initialImportError && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [initialImportError]);

  // Scroll-to-top is handled app-wide by <ScrollToTop /> (root layout).

  /** Back to the admin product search/list — preserves filters via history. */
  const goBackToList = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/admin/products";
  };

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
          description, content, overview, specifications, basePrice: parseFloat(basePrice),
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

  const importEanImages = async () => {
    if (!productId || eanImages.length === 0 || importingEanImages) return;
    setImportingEanImages(true); setError(""); setImportError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/import-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          images: eanImages.map(({ url, alt }) => ({ url, alt })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setImages(prev => [...prev, ...json.imported]);
        setEanImages([]);
        const n = json.imported.length;
        if (json.failedCount > 0) {
          const firstError = json.errors?.[0]?.error;
          const detail = firstError ? ` — ${firstError}` : "";
          setImportError(`${json.failedCount} immagine${json.failedCount > 1 ? "e" : ""} non importata${json.failedCount > 1 ? "e" : ""}${detail}`);
        } else {
          setSuccess(`${n} immagine${n > 1 ? "e" : ""} importata${n > 1 ? "e" : ""} su Storage.`);
        }
      } else {
        setImportError(json.error || "Errore durante l'import.");
      }
    } catch {
      setImportError("Errore di connessione.");
    }
    setImportingEanImages(false);
  };

  const handleIcecatLookup = async () => {
    const gtin = gtinQuery.trim();
    if (!gtin || eanLoading) return;
    setEanLoading(true); setError("");
    try {
      const res = await fetch(`/api/products/lookup-ean?ean=${encodeURIComponent(gtin)}`);
      if (!res.ok) { const e = await res.json(); setError(e.error || "Prodotto non trovato."); setEanLoading(false); return; }
      const data = await res.json();
      if (data.found) {
        // Prefill the (required) product EAN only when empty: the GTIN used
        // for the lookup is normally the product code itself. The EAN field
        // stays independent and editable — no hard link to Icecat.
        if (!barcode.trim()) setBarcode(gtin.replace(/\D/g, ""));
        // Remember the code that actually found data, so the same import can
        // be re-run later without retyping it.
        setIcecatCode(gtin.replace(/\D/g, ""));
        setIcecatData(data);
        setIcecatOpen(true);
      }
    } catch { setError("Errore di connessione."); }
    setEanLoading(false);
  };

  /** AI import from a manufacturer/campaign URL — extracts the same data Icecat returns. */
  const handleUrlLookup = async () => {
    const url = urlQuery.trim();
    if (!url || eanLoading) return;
    setEanLoading(true); setError("");
    try {
      const res = await fetch("/api/products/lookup-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || "Importazione fallita.");
        setEanLoading(false);
        return;
      }
      const data = await res.json();
      if (data.found) {
        setImportUrl(url);
        setIcecatData(data);
        setIcecatOpen(true);
      } else {
        setError(data.error || "Nessun dato estratto dalla pagina.");
      }
    } catch {
      setError("Errore di connessione.");
    }
    setEanLoading(false);
  };

  const handleIcecatApply = (selected: Set<IcecatSectionId>) => {
    if (!icecatData) return;
    const snapshot: IcecatFormSnapshot = { title, description, content, specifications, weight, brandId, categoryId };
    const applied = applyIcecatSelection(icecatData, selected, snapshot, { brands, categories });
    if (applied.title) updateTitle(applied.title);
    if (applied.description !== undefined) setDescription(applied.description);
    if (applied.content !== undefined) setContent(applied.content);
    if (applied.specifications !== undefined) setSpecifications(applied.specifications);
    if (applied.weight !== undefined) setWeight(String(applied.weight));
    if (applied.images) {
      setEanImages(applied.images.map((img, i) => ({
        url: img.url, alt: img.alt || "", sortOrder: i,
      })));
    }
    if (applied.brandId) setBrandId(applied.brandId);
    if (applied.categoryId) setCategoryId(applied.categoryId);
  };

  // ─── Gallery reorder + cover ─────────────────────────────────────
  // The first image (sort_order = 0) is the cover: reordering the list
  // both updates the UI and persists the new sort_order to the DB.
  const persistImageOrder = async (ordered: Image[]) => {
    const withIds = ordered.filter((img) => img.id);
    if (!productId || withIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/product-images/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          images: withIds.map((img, i) => ({ id: img.id, sortOrder: i })),
        }),
      });
      const json = await res.json();
      if (!json.success) setImportError(json.error || "Errore durante il riordino.");
    } catch {
      setImportError("Errore di connessione durante il riordino.");
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setImages(next);
    persistImageOrder(next);
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    moveImage(index, 0);
  };

  // Import the pending Icecat images for the given product. Returns the
  // imported images (to update the gallery state) plus an error message
  // (empty on success). Clears eanImages once imported.
  const importPendingImages = async (
    targetProductId: string,
  ): Promise<{ error: string; imported: { id: string; url: string; alt: string }[] }> => {
    if (eanImages.length === 0) return { error: "", imported: [] };
    try {
      const impRes = await fetch("/api/admin/import-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: targetProductId,
          images: eanImages.map(({ url, alt }) => ({ url, alt })),
        }),
      });
      const impJson = await impRes.json();
      if (!impRes.ok || !impJson.success) {
        return { error: impJson.error || "Errore durante l'importazione delle immagini.", imported: [] };
      }
      if (impJson.failedCount > 0) {
        const firstError = impJson.errors?.[0]?.error;
        const detail = firstError ? ` — ${firstError}` : "";
        return {
          error: `${impJson.failedCount} immagine${impJson.failedCount > 1 ? "e" : ""} non importata${impJson.failedCount > 1 ? "e" : ""}${detail}`,
          imported: (impJson.imported || []).map((img: { id: string; url: string; alt: string | null }) => ({
            id: img.id, url: img.url, alt: img.alt || "",
          })),
        };
      }
      setEanImages([]);
      return {
        error: "",
        imported: (impJson.imported || []).map((img: { id: string; url: string; alt: string | null }) => ({
          id: img.id, url: img.url, alt: img.alt || "",
        })),
      };
    } catch {
      return { error: "Errore di connessione durante l'importazione delle immagini.", imported: [] };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const ean = barcode.trim();
    if (!title.trim()) { setError("Il titolo è obbligatorio."); return; }
    if (!ean) { setError("Il GTIN (EAN/UPC) è obbligatorio."); return; }
    if (!/^\d{8,14}$/.test(ean)) { setError("GTIN non valido: deve contenere 8-14 cifre."); return; }
    if (!basePrice || isNaN(Number(basePrice))) { setError("Prezzo base non valido."); return; }
    setSaving(true);

    const body = {
      identifier: identifier || undefined,
      title: title.trim(), slug: slug || undefined,
      description, content, overview, specifications,
      basePrice: parseFloat(basePrice),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      sku: sku || null, barcode: ean, icecatCode: icecatCode || null, importUrl: importUrl || null,
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
        if (json.success) {
          // Copy pending Icecat images right after creation, then land on the
          // edit page. Surface failures instead of swallowing them.
          const { error: importMsg } = await importPendingImages(json.id);
          const qs = importMsg ? `?importError=${encodeURIComponent(importMsg)}` : "";
          router.push(`/admin/products/${json.id}${qs}`);
        }
        else setError(json.error ?? "Errore durante la creazione.");
      } else {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          // Also import pending Icecat images when saving an existing product,
          // and append them to the gallery state so they show up immediately.
          const { error: importMsg, imported } = await importPendingImages(productId!);
          if (importMsg) setImportError(importMsg);
          if (imported.length > 0) {
            setImages((prev) => {
              const existing = new Set(prev.map((img) => img.id));
              const fresh = imported.filter((img) => !existing.has(img.id));
              if (fresh.length === 0) return prev;
              return [...prev, ...fresh.map((img, i) => ({ ...img, sortOrder: prev.length + i }))];
            });
          }
          setSuccess(importMsg ? "Prodotto salvato (alcune immagini non importate)." : "Prodotto salvato!");
        }
        else setError(json.error ?? "Errore durante il salvataggio.");
      }
    } catch { setError("Errore di connessione."); }
    setSaving(false);
  };

  /**
   * Central "✨ Formatta SEO con AI" action (top bar): formats the detailed
   * description (when present) and then generates meta title/description.
   */
  const handleSeoAll = async () => {
    if (seoLoading) return;
    setSeoLoading(true); setError(""); setSuccess("");
    try {
      let source = description || content || "";
      if (content && content.trim()) {
        const fmtRes = await fetch("/api/ai/seo-format", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!fmtRes.ok) {
          const e = await fmtRes.json().catch(() => ({}));
          throw new Error(e.error || "Errore durante la formattazione della descrizione.");
        }
        const fmt = await fmtRes.json();
        if (fmt.formatted) {
          setContent(fmt.formatted);
          source = fmt.formatted;
        }
      }
      const genRes = await fetch("/api/admin/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product", title, description: source }),
      });
      if (!genRes.ok) {
        const e = await genRes.json().catch(() => ({}));
        throw new Error(e.error || "Errore durante la generazione dei meta.");
      }
      const gd = await genRes.json();
      if (gd.seoTitle) setSeoTitle(gd.seoTitle);
      if (gd.seoDescription) setSeoDescription(gd.seoDescription);
      setSuccess(
        content && content.trim()
          ? "Descrizione formattata e meta SEO generati con AI."
          : "Meta title e description generati con AI.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di connessione.");
    }
    setSeoLoading(false);
  };

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Breadcrumb / back to the product search */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={goBackToList}
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          title="Torna alla ricerca prodotti (mantiene filtri e pagina)">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Torna alla ricerca
        </button>
        <span aria-hidden="true" className="text-muted-foreground">/</span>
        <Link href="/admin/products" className="text-muted-foreground hover:text-foreground transition-colors">
          Prodotti
        </Link>
        <span aria-hidden="true" className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground truncate max-w-[280px]">
          {isNew ? "Nuovo prodotto" : `Modifica: ${title || productId}`}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Nuovo prodotto" : "Modifica prodotto"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isNew ? "Inserisci i dati del nuovo prodotto" : `ID: ${productId}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* Stato — inline with the header actions */}
          <div role="group" aria-label="Stato del prodotto" className="flex items-start gap-5 text-sm">
            <label className="flex cursor-pointer items-start gap-2 select-none">
              <input type="checkbox" aria-label="Pubblicato" checked={published} onChange={(e) => setPublished(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border accent-primary" />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">Pubblicato</span>
                <span className="text-[11px] text-muted-foreground">Visibile nel catalogo</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 select-none">
              <input type="checkbox" aria-label="In evidenza" checked={featured} onChange={(e) => setFeatured(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border accent-primary" />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">In evidenza</span>
                <span className="text-[11px] text-muted-foreground">Mostrato nella vetrina in homepage</span>
              </span>
            </label>
          </div>
          <div aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleSeoAll} disabled={!title.trim() || seoLoading}
              title="Formatta la descrizione dettagliata e genera meta title/description con l'AI"
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap">
              {seoLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              )}
              {seoLoading ? "Formattazione..." : "Formatta SEO con AI"}
            </button>
            {!isNew && slug && (
              <a
                href={`/product/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                title="Apre il prodotto nel negozio, in una nuova scheda"
              >
                👁️ Vedi nel negozio
              </a>
            )}
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
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600">{success}</div>}

      {/* ── Part 1: Informazioni di base (100%) — include prezzi, peso, organizzazione, varianti ── */}
      <section className="rounded-lg border bg-card p-5 space-y-5">
        {/* Section header: title left, Icecat import on the right */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <h2 className="font-semibold">Informazioni di base</h2>
          <div className="flex w-full max-w-xl flex-col gap-1.5 md:items-end">
            <div className="flex w-full flex-col gap-1.5 md:items-end">
              {/* Import source toggle */}
              <div className="flex w-full max-w-xl items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setImportSource("gtin")}
                  aria-pressed={importSource === "gtin"}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${importSource === "gtin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  GTIN (Icecat)
                </button>
                <button
                  type="button"
                  onClick={() => setImportSource("url")}
                  aria-pressed={importSource === "url"}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${importSource === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  URL (AI)
                </button>
              </div>

              <div className="flex w-full items-center gap-2">
                <label htmlFor={importSource === "gtin" ? "prod-gtin" : "prod-import-url"} className="sr-only">
                  {importSource === "gtin"
                    ? "Importa dati da Icecat per GTIN (EAN/UPC)"
                    : "Importa dati da URL con AI"}
                </label>
                <input
                  id={importSource === "gtin" ? "prod-gtin" : "prod-import-url"}
                  type="text"
                  value={importSource === "gtin" ? gtinQuery : urlQuery}
                  onChange={(e) => (importSource === "gtin" ? setGtinQuery(e.target.value) : setUrlQuery(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (importSource === "gtin") handleIcecatLookup();
                      else handleUrlLookup();
                    }
                  }}
                  placeholder={importSource === "gtin" ? "GTIN (EAN/UPC)" : "https://www.asus.com/..."}
                  autoComplete="off"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={importSource === "gtin" ? handleIcecatLookup : handleUrlLookup}
                  disabled={
                    (importSource === "gtin" ? gtinQuery.trim().length < 8 : !/^https?:\/\//i.test(urlQuery.trim())) ||
                    eanLoading
                  }
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {eanLoading ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : importSource === "gtin" ? "📦" : "🤖"}
                  {eanLoading ? "Caricamento..." : importSource === "gtin" ? "Importa dati da Icecat" : "Importa da URL"}
                </button>
              </div>

              {importSource === "gtin" ? (
                <>
                  <p className="text-[11px] text-muted-foreground md:text-right">
                    Importa da Icecat titolo, immagini e specifiche a partire dal codice GTIN.
                    Il codice usato viene salvato sul prodotto e{" "}
                    <span className="font-medium text-foreground/75">può non coincidere con il vero EAN</span>{" "}
                    (campo EAN / GTIN).
                  </p>
                  {icecatCode && (
                    <p className="text-[11px] text-muted-foreground md:text-right">
                      Codice Icecat usato: <span className="font-semibold text-foreground/85">{icecatCode}</span>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground md:text-right">
                    Estrae con l&apos;AI dalla pagina gli <span className="font-medium text-foreground/75">stessi dati di Icecat</span>
                    (titolo, descrizioni, specifiche, immagini) riusando lo stesso template. Il prompt è personalizzabile
                    in Impostazioni.
                  </p>
                  {importUrl && (
                    <p className="text-[11px] text-muted-foreground md:text-right">
                      URL import usato: <span className="font-semibold text-foreground/85 break-all">{importUrl}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-12">
            <label htmlFor="prod-title" className="block text-sm font-medium mb-1">Titolo *</label>
            <input id="prod-title" type="text" value={title} onChange={(e) => updateTitle(e.target.value)}
              required className={inputCls} />
          </div>
          <div className="md:col-span-6">
            <label htmlFor="prod-slug" className="block text-sm font-medium mb-1">Slug</label>
            <div className="flex gap-2">
              <input id="prod-slug" type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
                className={`flex-1 ${inputCls}`} />
              <button type="button" onClick={() => { setAutoSlug(true); updateTitle(title); }}
                className="rounded-md border border-border px-2 text-xs hover:bg-muted transition-colors" title="Auto-genera">↻</button>
            </div>
          </div>
          <div className="md:col-span-6">
            <label htmlFor="prod-barcode" className="block text-sm font-medium mb-1">EAN / GTIN *</label>
            <input
              id="prod-barcode"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="es. 4719512030394"
              required
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Codice GTIN del prodotto (EAN-13, UPC-A, EAN-8…). Obbligatorio e indipendente
              dalla ricerca Icecat: <span className="font-medium text-foreground/75">può non coincidere</span> con il codice
              usato per l&apos;importazione da Icecat.
            </p>
          </div>
          <div className="md:col-span-6">
            <label htmlFor="prod-identifier" className="block text-sm font-medium mb-1">Identificativo</label>
            <input id="prod-identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              className={inputCls} />
          </div>
          <div className="md:col-span-6">
            <label htmlFor="prod-sku" className="block text-sm font-medium mb-1">SKU</label>
            <input id="prod-sku" type="text" value={sku} onChange={(e) => setSku(e.target.value)}
              className={inputCls} />
          </div>
          <div className="md:col-span-12">
            <label htmlFor="prod-desc" className="block text-sm font-medium mb-1">Descrizione breve</label>
            <textarea id="prod-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className={inputCls} />
          </div>
        </div>

        {/* Prezzi + peso */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">Prezzi</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="prod-price" className="block text-sm font-medium mb-1">Prezzo base (€) *</label>
              <input id="prod-price" type="number" step="0.01" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                required className={inputCls} />
            </div>
            <div>
              <label htmlFor="prod-sale" className="block text-sm font-medium mb-1">In offerta (€)</label>
              <input id="prod-sale" type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label htmlFor="prod-cost" className="block text-sm font-medium mb-1">Di costo (€)</label>
              <input id="prod-cost" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label htmlFor="prod-weight" className="block text-sm font-medium mb-1">Peso (kg)</label>
              <input id="prod-weight" type="number" step="0.01" min="0" value={weight} onChange={(e) => setWeight(e.target.value)}
                className={inputCls} />
            </div>
          </div>
        </div>

        {/* Organizzazione */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">Organizzazione</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prod-cat" className="block text-sm font-medium mb-1">Categoria</label>
              <select id="prod-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className={inputCls}>
                <option value="">Nessuna categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="prod-brand" className="block text-sm font-medium mb-1">Marca</label>
              <select id="prod-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}
                className={inputCls}>
                <option value="">Nessuna marca</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Varianti */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">Varianti</h3>
          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna variante. Il prodotto avrà una variante predefinita.</p>
          ) : (
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-3">
                  <input value={v.name} onChange={(e) => {
                    const next = [...variants]; next[i] = { ...next[i], name: e.target.value }; setVariants(next);
                  }} placeholder="Nome variante" className="w-48 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                  <input type="number" value={v.price} onChange={(e) => {
                    const next = [...variants]; next[i] = { ...next[i], price: Number(e.target.value) }; setVariants(next);
                  }} placeholder="Prezzo" step="0.01" className="w-32 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                  <input type="number" value={v.stock} onChange={(e) => {
                    const next = [...variants]; next[i] = { ...next[i], stock: Number(e.target.value) }; setVariants(next);
                  }} placeholder="Stock" className="w-28 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                  <input value={v.sku} onChange={(e) => {
                    const next = [...variants]; next[i] = { ...next[i], sku: e.target.value }; setVariants(next);
                  }} placeholder="SKU" className="w-44 rounded border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
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
        </div>
      </section>

      {/* Immagini (100%) */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Immagini</h2>

        {/* Drop zone + URL fallback */}
        <div className="space-y-3">
          {/* File upload via drag & drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary'); }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-primary');
              const file = e.dataTransfer.files[0];
              if (!file || !productId) return;
              await uploadFile(file);
            }}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground mb-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="text-sm font-medium">Trascina un&apos;immagine qui</p>
            <p className="text-xs text-muted-foreground mt-1">o clicca per selezionare (JPG, PNG, WebP, AVIF — max 5MB)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              id="file-upload"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !productId) return;
                await uploadFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* URL fallback */}
          <div className="flex gap-2">
            <input type="text" placeholder="o incolla URL immagine..." value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            <input type="text" placeholder="Testo alt" value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
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
        </div>

        {/* Icecat lookup images — pending copy to Storage */}
        {eanImages.length > 0 && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {eanImages.length} {eanImages.length > 1 ? "immagini" : "immagine"} {eanImages.length > 1 ? "trovate" : "trovata"} su Icecat
              </p>
              {!isNew && (
                <button type="button" onClick={importEanImages} disabled={importingEanImages}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                  {importingEanImages ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "⬇️"}
                  {importingEanImages ? "Importazione..." : `Importa su Storage (${eanImages.length})`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {eanImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.url} alt={img.alt || "Anteprima Icecat"} className="h-16 w-16 rounded-md border object-cover" />
              ))}
            </div>
            {isNew && (
              <p className="text-xs text-muted-foreground">
                Le immagini verranno copiate su Storage automaticamente al salvataggio del prodotto.
              </p>
            )}
            {importError && <p className="text-xs text-red-600">{importError}</p>}
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" htmlFor="file-upload">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Carica dal computer
        </label>

        {isNew && <p className="text-xs text-muted-foreground">Salva prima il prodotto per poter aggiungere immagini.</p>}

        {/* Image list */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={img.id || i} className="relative group w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} className="h-24 w-24 rounded-md border object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Copertina
                  </span>
                )}
                <button type="button" onClick={async () => {
                  if (img.id) await fetch(`/api/admin/upload?id=${img.id}`, { method: "DELETE" });
                  setImages(prev => prev.filter((_, idx) => idx !== i));
                }}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Rimuovi immagine ${i + 1}`}>
                  ×
                </button>
                {/* Reorder + cover controls */}
                <div className="mt-1 flex items-center justify-between rounded-md border bg-background px-1 py-0.5">
                  <button type="button" onClick={() => moveImage(i, i - 1)} disabled={i === 0}
                    className="px-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                    aria-label={`Sposta immagine ${i + 1} prima`} title="Sposta prima">
                    ↑
                  </button>
                  <button type="button" onClick={() => setCoverImage(i)} disabled={i === 0}
                    className={`px-1 text-xs hover:text-amber-500 disabled:opacity-30 disabled:hover:text-muted-foreground ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                    aria-label={i === 0 ? "Immagine di copertina" : `Imposta immagine ${i + 1} come copertina`}
                    title={i === 0 ? "Copertina" : "Imposta come copertina"}>
                    ★
                  </button>
                  <button type="button" onClick={() => moveImage(i, i + 1)} disabled={i === images.length - 1}
                    className="px-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                    aria-label={`Sposta immagine ${i + 1} dopo`} title="Sposta dopo">
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Part 3: Descrizione dettagliata (100%) + meta SEO ──────── */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Descrizione dettagliata</h2>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Scrivi qui la descrizione dettagliata del prodotto..."
          minHeight={350}
          showSeoFormatButton={false}
        />
        <p className="text-xs text-muted-foreground">
          Formatta il contenuto con grassetti, elenchi, tabelle, immagini e link. Il font rimane sempre quello del sito.
          Usa il bottone <strong>✨ Formatta SEO con AI</strong> in alto per formattare questa descrizione e generare i meta.
        </p>

        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">SEO</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="prod-seo-title" className="block text-sm font-medium mb-1">Meta Title</label>
              <input id="prod-seo-title" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label htmlFor="prod-seo-desc" className="block text-sm font-medium mb-1">Meta Description</label>
              <textarea id="prod-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3}
                className={inputCls} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Part 3b: Panoramica (contenuti marketing) ──────────────── */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Panoramica — contenuti marketing</h2>
        <RichTextEditor
          value={overview}
          onChange={setOverview}
          placeholder="Contenuti marketing del prodotto: punti di forza, storytelling, immagini, video..."
          minHeight={220}
          showSeoFormatButton={false}
        />
        <p className="text-xs text-muted-foreground">
          Contenuto libero mostrato nella tab <strong>Panoramica</strong> della pagina prodotto (se compilato).
          Ottimo per immagini in evidenza, video e messaggi promozionali.
        </p>
      </section>

      {/* ── Part 4: Specifiche tecniche (100%) ─────────────────────── */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Specifiche tecniche</h2>
        <div>
          <SpecificationsEditor value={specifications} onChange={setSpecifications} />
          {specifications.trim() ? (
            <div className="mt-2 rounded-md border bg-muted/30 p-3 overflow-x-auto">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Anteprima</p>
              <SpecificationsView value={specifications} />
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Compilato automaticamente scegliendo &quot;Specifiche tecniche&quot; nella dialog Icecat. Visibile nella pagina prodotto lato utente.
            </p>
          )}
        </div>
      </section>

      <IcecatDialog
        open={icecatOpen}
        onOpenChange={setIcecatOpen}
        data={icecatData}
        snapshot={{ title, description, content, specifications, weight, brandId, categoryId }}
        brands={brands}
        categories={categories}
        onApply={handleIcecatApply}
      />
    </form>
  );
}
