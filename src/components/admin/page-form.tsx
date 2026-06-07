"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/admin/rich-text-editor";

interface Props { pageId?: string }

export default function PageForm({ pageId }: Props) {
  const router = useRouter();
  const isNew = !pageId;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(true);
  const [showInFooter, setShowInFooter] = useState(false);
  const [showInNav, setShowInNav] = useState(false);
  const [navOrder, setNavOrder] = useState(0);
  const [footerOrder, setFooterOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;
    fetch(`/api/admin/pages/${pageId}`).then(async (res) => {
      if (cancelled || !res.ok) return;
      const p = await res.json();
      setTitle(p.title); setSlug(p.slug); setContent(p.content || "");
      setExcerpt(p.excerpt || ""); setPublished(p.published);
      setShowInFooter(p.show_in_footer); setShowInNav(p.show_in_nav);
      setNavOrder(p.nav_order); setFooterOrder(p.footer_order);
    });
    return () => { cancelled = true; };
  }, [pageId]);

  const updateTitle = (v: string) => {
    setTitle(v);
    if (autoSlug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!title.trim()) { setError("Il titolo è obbligatorio."); return; }
    if (!slug.trim()) { setError("Lo slug è obbligatorio."); return; }
    setSaving(true);

    const body = { title: title.trim(), slug: slug.trim(), content, excerpt, published,
      showInFooter, showInNav, navOrder, footerOrder };

    try {
      if (isNew) {
        const res = await fetch("/api/admin/pages", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) router.push(`/admin/pages/${json.id}`);
        else setError(json.error ?? "Errore.");
      } else {
        const res = await fetch(`/api/admin/pages/${pageId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) { setSuccess("Pagina salvata!"); setTimeout(() => setSuccess(""), 3000); }
        else setError(json.error ?? "Errore.");
      }
    } catch { setError("Errore di connessione."); }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Nuova pagina" : "Modifica pagina"}</h1>
        <button type="submit" disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {saving ? "Salvataggio..." : isNew ? "Crea pagina" : "Salva modifiche"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Contenuto</h2>
            <div>
              <label htmlFor="pg-title" className="block text-sm font-medium mb-1">Titolo *</label>
              <input id="pg-title" type="text" value={title} onChange={(e) => updateTitle(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label htmlFor="pg-slug" className="block text-sm font-medium mb-1">Slug</label>
              <div className="flex gap-2">
                <input id="pg-slug" type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }} required
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
                <button type="button" onClick={() => { setAutoSlug(true); updateTitle(title); }}
                  className="rounded-md border border-border px-2 text-xs hover:bg-muted" title="Auto-genera">↻</button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Sarà accessibile a /{slug || "..."}</p>
            </div>
            <div>
              <p className="block text-sm font-medium mb-1">Contenuto della pagina</p>
              <RichTextEditor value={content} onChange={setContent} minHeight={400} placeholder="Scrivi il contenuto della pagina..." />
            </div>
            <div>
              <label htmlFor="pg-excerpt" className="block text-sm font-medium mb-1">Estratto (descrizione breve)</label>
              <textarea id="pg-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Stato</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded border-border" />
              Pubblicata
            </label>
          </section>

          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Visibilità</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showInNav} onChange={(e) => setShowInNav(e.target.checked)} className="rounded border-border" />
              Mostra nel menu di navigazione
            </label>
            {showInNav && (
              <div>
                <label htmlFor="pg-nav-order" className="block text-xs font-medium mb-1">Ordine nel menu</label>
                <input id="pg-nav-order" type="number" value={navOrder} onChange={(e) => setNavOrder(Number(e.target.value))}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showInFooter} onChange={(e) => setShowInFooter(e.target.checked)} className="rounded border-border" />
              Mostra nel footer
            </label>
            {showInFooter && (
              <div>
                <label htmlFor="pg-footer-order" className="block text-xs font-medium mb-1">Ordine nel footer</label>
                <input id="pg-footer-order" type="number" value={footerOrder} onChange={(e) => setFooterOrder(Number(e.target.value))}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            )}
          </section>
        </div>
      </div>
    </form>
  );
}
