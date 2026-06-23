import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// POST /api/admin/orders/[id]/notify — send status notification email
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;

  try {
    const order = await pool.query(`
      SELECT o.order_number, o.status, o.billing_name, o.billing_email
      FROM "order" o WHERE o.id = $1
    `, [id]);

    if (order.rows.length === 0) return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });

    const o = order.rows[0];
    const subject = `Infograf Store — Ordine ${o.order_number}: ${statusLabel(o.status)}`;
    const body = emailBody(o.billing_name, o.order_number, o.status);

    // Use Resend if configured, otherwise log
    if (process.env.AUTH_RESEND_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AUTH_RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Infograf Store <noreply@infografstore.it>",
          to: o.billing_email,
          subject,
          html: body,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("[ORDER NOTIFY] Resend error:", err);
      }
    }

    console.log(`[ORDER NOTIFY] Notified ${o.billing_email} about ${o.order_number}: ${o.status}`);
    return NextResponse.json({ success: true, sentTo: o.billing_email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Ricevuto",
    CONFIRMED: "Confermato",
    PROCESSING: "In elaborazione",
    SHIPPED: "Spedito",
    DELIVERED: "Consegnato",
    CANCELLED: "Annullato",
  };
  return labels[status] || status;
}

function emailBody(name: string, orderNumber: string, status: string): string {
  const statusMsg: Record<string, string> = {
    PENDING: "è stato ricevuto ed è in attesa di conferma.",
    CONFIRMED: "è stato confermato. Presto inizieremo a prepararlo.",
    PROCESSING: "è in fase di preparazione.",
    SHIPPED: "è stato spedito! Riceverai un aggiornamento con il tracking.",
    DELIVERED: "è stato consegnato. Grazie per aver acquistato da Infograf!",
    CANCELLED: "è stato annullato.",
  };
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px">
      <h2 style="color:#ff0c3c;">Infograf Store</h2>
      <p>Ciao ${name},</p>
      <p>Il tuo ordine <strong>${orderNumber}</strong> ${statusMsg[status] || "ha cambiato stato."}</p>
      <p style="color:#666;font-size:13px">Infograf — Dal 1992 a Palermo</p>
    </div>
  `;
}
