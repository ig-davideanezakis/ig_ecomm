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
  try {
    const { status: newStatus } = await request.json();
    if (!newStatus) return NextResponse.json({ error: "Status richiesto." }, { status: 400 });

    // Get current order
    const order = await pool.query(`SELECT id, status FROM "order" WHERE id = $1`, [id]);
    if (order.rows.length === 0) return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });

    const currentStatus = order.rows[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Transizione non valida: ${currentStatus} → ${newStatus}. Consentite: ${allowed.join(", ") || "nessuna"}.`,
      }, { status: 400 });
    }

    await pool.query(
      `UPDATE "order" SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, id]
    );

    // Log status change (if table exists)
    await pool.query(`
      INSERT INTO order_status_log (order_id, from_status, to_status, changed_by)
      VALUES ($1, $2, $3, 'admin')
    `, [id, currentStatus, newStatus]).catch(() => {});

    return NextResponse.json({ success: true, from: currentStatus, to: newStatus });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
