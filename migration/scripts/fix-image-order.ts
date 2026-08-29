import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env") });

import mysql from "mysql2/promise";
import { Pool } from "pg";
import { computeCoverFirstSortOrders } from "./image-utils";

// ─── Config ──────────────────────────────────────────────────────
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || "prestashop",
  password: process.env.MYSQL_PASSWORD || "prestashop_pass",
  database: process.env.MYSQL_DATABASE || "prestashop",
};
const TABLE_PREFIX = process.env.PS_PREFIX || "pr_";
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Fixes `product_image.sort_order` so the PrestaShop cover image (default image)
 * is always first, and the remaining images keep their original position order.
 * Re-runnable: it recomputes sort orders from MySQL every time.
 */
async function run() {
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  console.log("✓ Connected to MySQL (PrestaShop)");

  // Read all images with their cover flag from the source store
  const [imgRows] = (await mysqlConn.execute(
    `SELECT id_image, id_product, position, cover
     FROM ${TABLE_PREFIX}image
     ORDER BY id_product ASC, position ASC`
  )) as unknown as [{ id_image: number; id_product: number; position: number; cover: number | null }[], unknown];

  // Group by product
  const byProduct = new Map<number, { id_image: number; position: number; cover: number | null }[]>();
  for (const r of imgRows) {
    const list = byProduct.get(r.id_product) || [];
    list.push(r);
    byProduct.set(r.id_product, list);
  }
  console.log(`  → ${imgRows.length} images across ${byProduct.size} PS products`);

  // Compute cover-first sort orders
  const sortByImgId = new Map<number, number>();
  for (const [, imgs] of byProduct) {
    const orders = computeCoverFirstSortOrders(imgs.map((i) => ({ id: i.id_image, position: i.position, cover: i.cover })));
    for (const [imgId, order] of orders) sortByImgId.set(Number(imgId), order);
  }

  // Fetch all migrated product_image rows (url embeds PS ids: products/{psProdId}/{psImgId}.jpg)
  const imgResult = await pgPool.query(`SELECT id, url FROM "product_image"`);
  const rows = imgResult.rows as { id: string; url: string }[];
  console.log(`  → ${rows.length} product_image rows in PostgreSQL`);

  let updated = 0;
  let coverMismatch = 0;
  for (const r of rows) {
    const match = r.url.match(/\/products\/(\d+)\/(\d+)\.jpg$/);
    if (!match) continue;
    const psImgId = Number(match[2]);
    const sortOrder = sortByImgId.get(psImgId);
    if (sortOrder === undefined) continue;

    // Update only when the order actually changes
    const current = await pgPool.query(`SELECT sort_order FROM "product_image" WHERE id = $1`, [r.id]);
    const currentOrder = (current.rows[0] as { sort_order: number } | undefined)?.sort_order;
    if (currentOrder !== sortOrder) {
      await pgPool.query(`UPDATE "product_image" SET sort_order = $1 WHERE id = $2`, [sortOrder, r.id]);
      updated++;
      if (currentOrder !== undefined && (currentOrder === 0 || sortOrder === 0)) {
        coverMismatch++;
      }
    }
  }

  console.log(`  → ${updated} sort orders fixed (${coverMismatch} involved the cover image)`);

  await mysqlConn.end();
  await pgPool.end();
  console.log("✅ Image order fix completed!");
}

run().catch((err) => {
  console.error("Image order fix failed:", err);
  process.exit(1);
});
