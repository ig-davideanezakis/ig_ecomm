"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string; title: string; slug: string; sku: string | null;
  basePrice: number; compareAtPrice: number | null;
  featured: boolean; published: boolean;
  total_stock: number; variant_count: number;
  created_at: string;
  category: { name: string } | null;
  brand: { name: string } | null;
}

interface Filters { categories: { id: string; name: string; slug: string }[]; brands: { id: string; name: string; slug: string }[]; }

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort, limit: "20" });
    if (search) params.set("search", search);
    if (catFilter) params.set("category", catFilter);
    if (brandFilter) params.set("brand", brandFilter);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/products?${params}`);
    const json = await res.json();
    setProducts(json.products);
    setFilters(json.filters);
    setTotalPages(json.pagination.totalPages);
    setLoading(false);
  }, [page, sort, search, catFilter, brandFilter, statusFilter]);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) { fetchProducts(); return; }
    initRef.current = true;
    // Fetch on mount with a microtask delay to avoid ESLint cascade warning
    const id = setTimeout(() => fetchProducts(), 0);
    return () => clearTimeout(id);
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo prodotto?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0 || !confirm(`Eliminare ${selected.size} prodotti?`)) return;
    setBulkDeleting(true);
    await Promise.all([...selected].map(id =>
      fetch(`/api/admin/products/${id}`, { method: "DELETE" }),
    ));
    setSelected(new Set());
    setBulkDeleting(false);
    fetchProducts();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prodotti</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} prodotti caricati</p>
        </div>
        <Link href="/admin/products/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          + Nuovo prodotto
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="search" placeholder="Cerca prodotti..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
          className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Tutte le categorie</option>
          {filters?.categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Tutte le marche</option>
          {filters?.brands.map(b => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Tutti gli stati</option>
          <option value="published">Pubblicati</option>
          <option value="draft">Bozze</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
          <option value="newest">Più recenti</option>
          <option value="title">Nome A–Z</option>
          <option value="price_asc">Prezzo crescente</option>
          <option value="price_desc">Prezzo decrescente</option>
        </select>
        <button onClick={fetchProducts} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Cerca
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2 text-sm">
          <span>{selected.size} selezionati</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="text-destructive hover:underline disabled:opacity-50">
            {bulkDeleting ? "Eliminazione..." : "Elimina selezionati"}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:underline">Deseleziona</button>
        </div>
      )}

      {/* Products table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Nessun prodotto trovato.</p>
          <Link href="/admin/products/new" className="mt-2 inline-block text-sm text-primary hover:underline">
            Crea il primo prodotto
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(products.map(p => p.id)));
                    else setSelected(new Set());
                  }} checked={selected.size === products.length && products.length > 0} />
                </th>
                <th className="px-4 py-3 font-medium">Prodotto</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Prezzo</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-primary transition-colors">
                      {p.title}
                    </Link>
                    {p.featured && <span className="ml-2 text-[10px] font-semibold text-primary">IN EVIDENZA</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sku || "—"}</td>
                  <td className="px-4 py-3 font-medium">€{Number(p.basePrice).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={p.total_stock <= 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {p.total_stock} ({p.variant_count} var.)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category?.name || "—"}</td>
                  <td className="px-4 py-3">
                    {p.published
                      ? <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">Pubblicato</span>
                      : <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">Bozza</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => router.push(`/admin/products/${p.id}`)}
                        className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        Modifica
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-muted transition-colors">
            Precedente
          </button>
          <span className="text-sm text-muted-foreground">Pagina {page} di {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-muted transition-colors">
            Successiva
          </button>
        </div>
      )}
    </div>
  );
}
