"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string; name: string; slug: string; parent_id: string | null;
  sort_order: number; is_active: boolean; noindex: boolean;
  image: string | null; icon: string | null;
  active_from: string | null; active_until: string | null;
  product_count?: number; children: Category[];
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/categories").then(async (res) => {
      const json = await res.json();
      setTree(json.tree || []);
      setLoading(false);
    });
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminare "${name}" e spostare le sue sottocategorie al livello superiore?`)) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setTree(prev => removeFromTree(prev, id));
  };

  const removeFromTree = (nodes: Category[], id: string): Category[] => {
    return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: removeFromTree(n.children, id) }));
  };

  const handleDrop = async (draggedId: string, targetId: string | null, asChild: boolean) => {
    // If dropping as child of target
    if (asChild && targetId) {
      const targetCat = findInTree(tree, targetId);
      const targetChildren = targetCat?.children?.length || 0;
      await fetch(`/api/admin/categories/${draggedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _reorder: true, parentId: targetId, sortOrder: targetChildren }),
      });
    } else {
      // Drop as sibling — find the parent of both
      const dragNode = findInTree(tree, draggedId);
      const dragParent = findParent(tree, draggedId);
      const targetParent = targetId ? findParent(tree, targetId) : null;
      const newParentId = targetParent?.id || null;
      await fetch(`/api/admin/categories/${draggedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _reorder: true, parentId: newParentId, sortOrder: 0 }),
      });
    }
    // Refresh
    const res = await fetch("/api/admin/categories");
    const json = await res.json();
    setTree(json.tree || []);
    setDragId(null); setDropTarget(null);
  };

  const findInTree = (nodes: Category[], id: string): Category | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findInTree(n.children, id);
      if (found) return found;
    }
    return null;
  };

  const findParent = (nodes: Category[], id: string, parent: Category | null = null): Category | null => {
    for (const n of nodes) {
      if (n.id === id) return parent;
      const found = findParent(n.children, id, n);
      if (found) return found;
    }
    return null;
  };

  const countProducts = (node: Category): number => {
    return (node.product_count || 0) + (node.children?.reduce((sum, c) => sum + countProducts(c), 0) || 0);
  };

  const renderTree = (nodes: Category[], depth = 0) => {
    return nodes.map((cat) => {
      const isOver = dropTarget === cat.id;
      const prodCount = countProducts(cat);
      return (
        <div key={cat.id}>
          <div
            draggable
            onDragStart={() => setDragId(cat.id)}
            onDragOver={(e) => { e.preventDefault(); setDropTarget(cat.id); }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== cat.id) handleDrop(dragId, cat.id, true);
            }}
            className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              isOver ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted/50'
            } ${dragId === cat.id ? 'opacity-50' : ''}`}
            style={{ marginLeft: depth * 28 }}
          >
            <button onClick={() => toggleExpand(cat.id)}
              className="w-5 text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer">
              {cat.children.length > 0 ? (expanded.has(cat.id) ? "▼" : "▶") : "·"}
            </button>

            <span className="flex-1 text-sm font-medium flex items-center gap-2">
              {cat.icon && <span>{cat.icon}</span>}
              <span className={!cat.is_active ? "text-muted-foreground line-through" : ""}>{cat.name}</span>
              {cat.noindex && <span className="text-[10px] text-yellow-500 font-medium">NOINDEX</span>}
            </span>

            <span className="text-xs text-muted-foreground">{prodCount} prod.</span>

            {!cat.is_active && (
              <span className="rounded bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:text-yellow-400">Inattiva</span>
            )}
            {cat.active_from && new Date(cat.active_from) > new Date() && (
              <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">Programmata</span>
            )}

            <span className="hidden sm:block text-xs text-muted-foreground">/{cat.slug}</span>

            <button onClick={() => router.push(`/admin/categories/${cat.id}`)}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Modifica
            </button>
            <button onClick={() => handleDelete(cat.id, cat.name)}
              className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
              Elimina
            </button>
          </div>
          {expanded.has(cat.id) && cat.children.length > 0 && renderTree(cat.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorie</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestisci l&apos;alberatura delle categorie. Trascina per riordinare.</p>
        </div>
        <button onClick={() => router.push("/admin/categories/new")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          + Nuova categoria
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>
      ) : tree.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">Nessuna categoria creata.</p>
          <button onClick={() => router.push("/admin/categories/new")}
            className="mt-2 text-sm text-primary hover:underline">
            Crea la prima categoria
          </button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-2">
          {renderTree(tree)}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Trascina una categoria su un&apos;altra per renderla sua sottocategoria.
        L&apos;ordinamento per numero è gestito tramite il campo Ordine nella modifica.
      </p>
    </div>
  );
}
