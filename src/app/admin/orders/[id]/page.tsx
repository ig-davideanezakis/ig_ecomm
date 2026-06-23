"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface OrderDetail {
  id: string; order_number: string; status: string;
  subtotal: number; shipping_cost: number; discount: number; total: number;
  payment_method: string; payment_status: string; payment_id: string; paid_at: string;
  billing_name: string; billing_email: string; billing_phone: string;
  billing_address: string; billing_city: string; billing_province: string; billing_zip: string;
  shipping_name: string; shipping_email: string; shipping_phone: string;
  shipping_address: string; shipping_city: string; shipping_province: string; shipping_zip: string;
  shipping_method: string; tracking_number: string; tracking_url: string;
  notes: string; created_at: string; user_name: string; user_email: string;
  items: OrderItem[]; statusHistory: StatusLog[];
}

interface OrderItem { id: string; quantity: number; unit_price: number; total_price: number; product_title: string; product_slug: string; variant_name: string; variant_sku: string; image_url: string; }
interface StatusLog { from_status: string; to_status: string; created_at: string; changed_by: string; }

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In attesa", CONFIRMED: "Confermato", PROCESSING: "In elaborazione",
  SHIPPED: "Spedito", DELIVERED: "Consegnato", CANCELLED: "Annullato",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  CONFIRMED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  PROCESSING: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  SHIPPED: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  DELIVERED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrapped = use(params);
  const id = unwrapped.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/orders/${id}`)
      .then(r => r.json())
      .then(d => { setOrder(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setError("");
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) {
      setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
      setSuccess(`Stato aggiornato: ${STATUS_LABELS[newStatus]}`);
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(json.error || "Errore");
    }
  };

  const saveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSaving(true); setError(""); setSuccess("");
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingNumber: order.tracking_number,
        trackingUrl: order.tracking_url,
        notes: order.notes,
        paymentStatus: order.payment_status,
        paymentId: order.payment_id,
        paymentMethod: order.payment_method,
      }),
    });
    const json = await res.json();
    if (json.success) { setSuccess("Salvato!"); setTimeout(() => setSuccess(""), 3000); }
    else setError(json.error || "Errore");
    setSaving(false);
  };

  const sendNotification = async () => {
    const res = await fetch(`/api/admin/orders/${id}/notify`, { method: "POST" });
    const json = await res.json();
    if (json.success) { setSuccess("Email inviata a " + json.sentTo); setTimeout(() => setSuccess(""), 3000); }
    else setError(json.error || "Errore");
  };

  if (loading || !order) return <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push("/admin/orders")} className="text-xs text-muted-foreground hover:text-foreground mb-2">&larr; Torna agli ordini</button>
          <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString("it-IT")}
            {order.user_name && <> &middot; {order.user_name}</>}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] || ""}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {success && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600">{success}</div>}
      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Main: Items + Addresses */}
        <div className="xl:col-span-2 space-y-6">
          {/* Items */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-4">Prodotti</h2>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Prodotto</th>
                <th className="pb-2 font-medium">Variante</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium text-right">Prezzo</th>
                <th className="pb-2 font-medium text-right">Totale</th>
              </tr></thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {item.image_url && <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover border" />}
                        <span>{item.product_title}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{item.variant_name || "—"}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">&euro;{Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-3 text-right font-medium">&euro;{Number(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Addresses */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-lg border bg-card p-6 space-y-2">
              <h2 className="font-semibold">Fatturazione</h2>
              <p className="text-sm">{order.billing_name}<br />{order.billing_address}<br />{order.billing_city} {order.billing_zip}<br />{order.billing_email}<br />{order.billing_phone}</p>
            </section>
            <section className="rounded-lg border bg-card p-6 space-y-2">
              <h2 className="font-semibold">Spedizione</h2>
              <p className="text-sm">{order.shipping_name || order.billing_name}<br />{order.shipping_address || order.billing_address}<br />{order.shipping_city} {order.shipping_zip}<br />{order.shipping_method}</p>
            </section>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status actions */}
          <section className="rounded-lg border bg-card p-6 space-y-3">
            <h2 className="font-semibold">Azioni</h2>
            {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Cambia stato:</p>
                <div className="flex flex-wrap gap-2">
                  {(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const)
                    .filter(s => s !== order.status)
                    .map(s => (
                      <button key={s} onClick={() => updateStatus(s)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <button onClick={sendNotification} className="text-xs text-primary hover:underline">
              Invia email notifica
            </button>
          </section>

          {/* Payment */}
          <section className="rounded-lg border bg-card p-6 space-y-3">
            <h2 className="font-semibold">Pagamento</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Metodo:</span><span>{order.payment_method || "—"}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stato:</span>
                <span className={order.payment_status === "PAID" ? "text-green-600 font-medium" : "text-yellow-600"}>
                  {order.payment_status === "PAID" ? "Pagato" : order.payment_status === "PENDING" ? "In attesa" : order.payment_status || "—"}
                </span>
              </div>
              {order.paid_at && <div className="flex justify-between"><span className="text-muted-foreground">Data pag.:</span><span>{new Date(order.paid_at).toLocaleDateString("it-IT")}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">ID trans.:</span><span className="text-xs">{order.payment_id || "—"}</span></div>
            </div>
          </section>

          {/* Totals */}
          <section className="rounded-lg border bg-card p-6 space-y-2">
            <h2 className="font-semibold">Riepilogo</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotale</span><span>&euro;{Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Spedizione</span><span>{order.shipping_cost > 0 ? "€" + Number(order.shipping_cost).toFixed(2) : "Gratuita"}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Sconto</span><span className="text-green-600">-€{Number(order.discount).toFixed(2)}</span></div>}
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Totale</span><span>&euro;{Number(order.total).toFixed(2)}</span></div>
            </div>
          </section>

          {/* Tracking + Notes + Payment (editable) */}
          <form onSubmit={saveOrder} className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Modifica</h2>

            <div>
              <label htmlFor="edit-pay-status" className="block text-xs font-medium mb-1">Stato pagamento</label>
              <select id="edit-pay-status" value={order.payment_status} onChange={e => setOrder({ ...order, payment_status: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                <option value="PENDING">In attesa</option>
                <option value="PAID">Pagato</option>
                <option value="FAILED">Fallito</option>
                <option value="REFUNDED">Rimborsato</option>
                <option value="PARTIALLY_REFUNDED">Parzialmente rimborsato</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-pay-id" className="block text-xs font-medium mb-1">ID transazione / bonifico</label>
              <input id="edit-pay-id" type="text" value={order.payment_id || ""} onChange={e => setOrder({ ...order, payment_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="edit-pay-method" className="block text-xs font-medium mb-1">Metodo pagamento</label>
              <input id="edit-pay-method" type="text" value={order.payment_method || ""} onChange={e => setOrder({ ...order, payment_method: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="edit-tracking" className="block text-xs font-medium mb-1">Tracking number</label>
              <input id="edit-tracking" type="text" value={order.tracking_number || ""} onChange={e => setOrder({ ...order, tracking_number: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="edit-tracking-url" className="block text-xs font-medium mb-1">Tracking URL</label>
              <input id="edit-tracking-url" type="url" value={order.tracking_url || ""} onChange={e => setOrder({ ...order, tracking_url: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="edit-notes" className="block text-xs font-medium mb-1">Note</label>
              <textarea id="edit-notes" value={order.notes || ""} onChange={e => setOrder({ ...order, notes: e.target.value })} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </form>

          {/* Status timeline */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <section className="rounded-lg border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Timeline</h2>
              <div className="space-y-2">
                {order.statusHistory.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <span className="font-medium">{STATUS_LABELS[log.to_status] || log.to_status}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(log.created_at).toLocaleString("it-IT")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
