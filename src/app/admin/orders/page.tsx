"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  shipping_cost: number;
  created_at: string;
  billing_name: string;
  billing_email: string;
  item_count: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermato",
  PROCESSING: "In elaborazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  CONFIRMED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  PROCESSING: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  SHIPPED: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  DELIVERED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const fetchOrders = async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20", sort: "newest" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/admin/orders?${params}`);
    const json = await res.json();
    setOrders(json.orders || []);
    setTotalPages(json.pagination?.totalPages || 1);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(1); }, [status]);

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selected.size === 0) return;
    for (const id of selected) {
      await fetch(`/api/admin/orders/${id}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: bulkStatus }),
      });
    }
    setSelected(new Set());
    fetchOrders(page);
  };

  const exportCSV = () => {
    const params = new URLSearchParams({ format: "csv", limit: "5000" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/admin/orders?${params}`, "_blank");
  };

  if (loading && orders.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ordini</h1>
        <button onClick={exportCSV} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
          Esporta CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input type="search" placeholder="Cerca ordine, cliente..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchOrders(1)}
            className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          <button onClick={() => fetchOrders(1)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Cerca
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2 text-sm">
          <span>{selected.size} selezionati</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-xs">
            <option value="">Cambia stato...</option>
            {["CONFIRMED", "PROCESSING", "CANCELLED"].map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button onClick={handleBulkUpdate} disabled={!bulkStatus}
            className="text-xs text-primary hover:underline disabled:opacity-30">
            Applica
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:underline">Deseleziona</button>
        </div>
      )}

      {/* Orders table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="w-10 px-4 py-3"><input type="checkbox" onChange={e => {
                if (e.target.checked) setSelected(new Set(orders.map(o => o.id)));
                else setSelected(new Set());
              }} checked={selected.size === orders.length && orders.length > 0} /></th>
              <th className="px-4 py-3 font-medium">Ordine</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Totale</th>
              <th className="px-4 py-3 font-medium">Pagamento</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(o.id)}
                  onChange={() => setSelected(p => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} /></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary transition-colors">{o.order_number}</Link>
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground">{o.billing_name}</div>
                  <div className="text-xs text-muted-foreground">{o.billing_email}</div>
                </td>
                <td className="px-4 py-3 font-medium">&euro;{Number(o.total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs">{o.payment_method || "—"}</span>
                  <span className={`ml-1 text-[10px] ${o.payment_status === "PAID" ? "text-green-600" : "text-yellow-600"}`}>
                    {o.payment_status === "PAID" ? "✓" : o.payment_status || ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[o.status] || ""}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { setPage(p => Math.max(1, p - 1)); fetchOrders(page - 1); }}
            disabled={page <= 1} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-muted">
            Precedente
          </button>
          <span className="text-sm text-muted-foreground">Pagina {page} di {totalPages}</span>
          <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchOrders(page + 1); }}
            disabled={page >= totalPages} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-muted">
            Successiva
          </button>
        </div>
      )}
    </div>
  );
}
