import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// Order status flow validation
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

// PUT /api/admin/orders/[id]/status
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;

  let newStatus: string | undefined;
  try {
    ({ status: newStatus } = await request.json());
  } catch {
    return NextResponse.json({ error: "Body JSON richiesto." }, { status: 400 });
  }
  if (!newStatus) return NextResponse.json({ error: "Status richiesto." }, { status: 400 });

  const client = await pool.connect();
  let currentStatus = "";
  try {
    await client.query("BEGIN");

    // Lock the order row so a concurrent status change can't race this one.
    const order = await client.query(`SELECT id, status FROM "order" WHERE id = $1 FOR UPDATE`, [id]);
    if (order.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });
    }

    currentStatus = order.rows[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      await client.query("ROLLBACK");
      return NextResponse.json({
        error: `Transizione non valida: ${currentStatus} → ${newStatus}. Consentite: ${allowed.join(", ") || "nessuna"}.`,
      }, { status: 400 });
    }

    await client.query(`UPDATE "order" SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, id]);

    // Cancelling releases the stock that was reserved when the order was created.
    if (newStatus === "CANCELLED") {
      await client.query(
        `UPDATE product_variant SET stock = stock + order_item.quantity
         FROM order_item
         WHERE order_item.order_id = $1 AND order_item.variant_id = product_variant.id`,
        [id]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  } finally {
    client.release();
  }

  // Best-effort audit log — kept outside the transaction (table is optional/not migrated everywhere).
  await pool.query(`
    INSERT INTO order_status_log (order_id, from_status, to_status, changed_by)
    VALUES ($1, $2, $3, 'admin')
  `, [id, currentStatus, newStatus]).catch(() => {});

  return NextResponse.json({ success: true, from: currentStatus, to: newStatus });
}
