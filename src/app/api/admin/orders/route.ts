import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/orders — list with filters, pagination, export CSV
export async function GET(request: NextRequest) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const format = searchParams.get("format") || "";
  const skip = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIdx = 0;

    if (status) {
      paramIdx++; conditions.push(`o.status = $${paramIdx}`); queryParams.push(status);
    }
    if (search) {
      paramIdx++;
      conditions.push(`(o.order_number ILIKE $${paramIdx} OR o.billing_name ILIKE $${paramIdx} OR o.billing_email ILIKE $${paramIdx})`);
      queryParams.push(`%${search}%`);
    }
    if (dateFrom) {
      paramIdx++; conditions.push(`o.created_at >= $${paramIdx}`); queryParams.push(dateFrom);
    }
    if (dateTo) {
      paramIdx++; conditions.push(`o.created_at <= $${paramIdx}::date + interval '1 day'`); queryParams.push(dateTo);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const orderClause = sort === "oldest" ? "o.created_at ASC" : "o.created_at DESC";

    // Export CSV
    if (format === "csv") {
      const csvResult = await pool.query(`
        SELECT o.order_number, o.status, o.payment_status, o.payment_method,
          o.total::float, o.shipping_cost::float, o.created_at,
          o.billing_name, o.billing_email, o.billing_address, o.billing_city, o.billing_zip,
          o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_zip, o.shipping_method,
          o.tracking_number, o.payment_id, o.notes
        FROM "order" o ${whereClause} ORDER BY ${orderClause}
      `, queryParams);

      const csvRows = csvResult.rows.map(r => Object.values(r).map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","));
      const headers = Object.keys(csvResult.rows[0] || {}).join(",");
      const csv = [headers, ...csvRows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ordini-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Count
    const countResult = await pool.query(`SELECT COUNT(*)::int as total FROM "order" o ${whereClause}`, queryParams);
    const total = countResult.rows[0]?.total ?? 0;

    // List
    const result = await pool.query(`
      SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method,
        o.total::float, o.shipping_cost::float, o.created_at,
        o.billing_name, o.billing_email,
        (SELECT COUNT(*)::int FROM order_item oi WHERE oi.order_id = o.id) as item_count
      FROM "order" o ${whereClause}
      ORDER BY ${orderClause} LIMIT ${limit} OFFSET ${skip}
    `, queryParams);

    return NextResponse.json({
      orders: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
