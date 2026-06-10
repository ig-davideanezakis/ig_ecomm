import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Updating filter system...");

  await pool.query(`ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false`);
  console.log("✓ is_system column added");

  await pool.query(`UPDATE "filter" SET is_system = true WHERE slug IN ('price', 'stock')`);
  console.log("✓ price and stock marked as system");

  // Update stock options: use Italian product-status values
  await pool.query(`DELETE FROM "filter_option" WHERE filter_id IN (SELECT id FROM "filter" WHERE slug = 'stock')`);
  const stockFilter = await pool.query(`SELECT id FROM "filter" WHERE slug = 'stock'`);
  const stockId = stockFilter.rows[0]?.id;
  if (stockId) {
    await pool.query(
      `INSERT INTO "filter_option" (value, label, slug, sort_order, filter_id) VALUES
        ('disponibile', 'Disponibile', 'disponibile', 1, $1),
        ('non_disponibile', 'Non disponibile', 'non_disponibile', 2, $1),
        ('ordinabile', 'Ordinabile', 'ordinabile', 3, $1),
        ('preordine', 'Preordine', 'preordine', 4, $1)`,
      [stockId]
    );
    console.log("✓ stock options updated to: disponibile, non disponibile, ordinabile, preordine");
  }

  // Update price filter: remove its options (it's dynamic, no options needed)
  await pool.query(`DELETE FROM "filter_option" WHERE filter_id IN (SELECT id FROM "filter" WHERE slug = 'price')`);
  console.log("✓ price filter options cleared (dynamic range)");

  await pool.end();
  console.log("Done!");
}
run().catch((e) => { console.error(e); process.exit(1); });
