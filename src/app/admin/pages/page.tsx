"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PageItem {
  id: string; title: string; slug: string; published: boolean;
  showInFooter: boolean; showInNav: boolean; updatedAt: string;
}

export default function AdminPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pages").then(async (res) => {
      const json = await res.json();
      setPages(json);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questa pagina?")) return;
    await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    setPages(p => p.filter(pg => pg.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pagine</h1>
        <button onClick={() => router.push("/admin/pages/new")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          + Nuova pagina
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>
      ) : pages.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Nessuna pagina creata.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Titolo</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Nav</th>
                <th className="px-4 py-3 font-medium">Footer</th>
                <th className="px-4 py-3 font-medium">Ultima modifica</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">/{p.slug}</td>
                  <td className="px-4 py-3">
                    {p.published
                      ? <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700">Pubblicata</span>
                      : <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-700">Bozza</span>
                    }
                  </td>
                  <td className="px-4 py-3">{p.showInNav ? "✅" : "—"}</td>
                  <td className="px-4 py-3">{p.showInFooter ? "✅" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString("it-IT")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/admin/pages/${p.id}`)}
                      className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      Modifica
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors ml-1">
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
