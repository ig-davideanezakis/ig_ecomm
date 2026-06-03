import { pool } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockCount: number;
  newCustomers: number;
  ordersToday: number;
  revenueToday: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  billingName: string;
  billingEmail: string;
  createdAt: Date | string;
  itemCount: number;
}

export interface LowStockItem {
  id: string;
  variantName: string;
  productTitle: string;
  productSlug: string;
  sku: string | null;
  stock: number;
  lowStock: number;
}

// ─── Queries ──────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "product") AS "totalProducts",
      (SELECT COUNT(*)::int FROM "order") AS "totalOrders",
      (SELECT COALESCE(SUM(total::numeric), 0)::float FROM "order") AS "totalRevenue",
      (SELECT COUNT(*)::int FROM "order" WHERE status IN ('PENDING', 'CONFIRMED', 'PROCESSING')) AS "pendingOrders",
      (SELECT COUNT(*)::int FROM "product_variant" WHERE stock <= "low_stock") AS "lowStockCount",
      (SELECT COUNT(*)::int FROM "user") AS "newCustomers",
      (SELECT COUNT(*)::int FROM "order" WHERE "created_at" >= CURRENT_DATE) AS "ordersToday",
      (SELECT COALESCE(SUM(total::numeric), 0)::float FROM "order" WHERE "created_at" >= CURRENT_DATE) AS "revenueToday"
  `);

  return result.rows[0] as DashboardStats;
}

export async function getRevenueData(days: number = 7): Promise<RevenueDataPoint[]> {
  const result = await pool.query(
    `
    SELECT
      d::date AS date,
      COALESCE(SUM(o.total::numeric), 0)::float AS revenue,
      COUNT(o.id)::int AS orders
    FROM generate_series(
      CURRENT_DATE - $1::interval,
      CURRENT_DATE,
      '1 day'::interval
    ) d
    LEFT JOIN "order" o ON o."created_at"::date = d::date
    GROUP BY d::date
    ORDER BY d::date ASC
    `,
    [`${days - 1} days`],
  );

  return result.rows as RevenueDataPoint[];
}

export async function getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
  const result = await pool.query(
    `
    SELECT
      o.id, o."order_number", o.status, o.total::float AS total,
      o."billing_name", o."billing_email", o."created_at",
      (SELECT COUNT(*)::int FROM "order_item" oi WHERE oi."order_id" = o.id) AS "itemCount"
    FROM "order" o
    ORDER BY o."created_at" DESC
    LIMIT $1
    `,
    [limit],
  );

  return result.rows as RecentOrder[];
}

export async function getLowStockProducts(): Promise<LowStockItem[]> {
  const result = await pool.query(
    `
    SELECT
      v.id, v.name AS "variantName", p.title AS "productTitle",
      p.slug AS "productSlug", v.sku, v.stock, v."low_stock"
    FROM "product_variant" v
    JOIN "product" p ON p.id = v."product_id"
    WHERE v.stock <= v."low_stock"
    ORDER BY v.stock ASC, v."low_stock" DESC
    LIMIT 10
    `,
  );

  return result.rows as LowStockItem[];
}

export async function getDashboardData(days: number = 7) {
  const [stats, revenue, recentOrders, lowStockProducts] = await Promise.all([
    getDashboardStats(),
    getRevenueData(days),
    getRecentOrders(),
    getLowStockProducts(),
  ]);

  return { stats, revenue, recentOrders, lowStockProducts };
}
