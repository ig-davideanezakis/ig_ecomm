import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Fixing category_filter constraints...");

  // Drop old unique constraint (category_id, filter_key)
  await pool.query(
    `ALTER TABLE "category_filter" DROP CONSTRAINT IF EXISTS "category_filter_category_id_filter_key_key"`
  );
  console.log("  ✓ dropped old unique(category_id, filter_key)");

  // Add new unique constraint (category_id, filter_id)
  // Drop first if it already exists (from migration attempts)
  await pool.query(
    `ALTER TABLE "category_filter" DROP CONSTRAINT IF EXISTS "category_filter_category_id_filter_id_key"`
  ).catch(() => {});
  
  await pool.query(
    `ALTER TABLE "category_filter" ADD CONSTRAINT "category_filter_category_id_filter_id_key" UNIQUE (category_id, filter_id)`
  );
  console.log("  ✓ added unique(category_id, filter_id)");

  // Also drop old filter_key column if it exists (no longer needed)
  await pool.query(
    `ALTER TABLE "category_filter" DROP COLUMN IF EXISTS "filter_key"`
  ).catch(() => {});
  await pool.query(
    `ALTER TABLE "category_filter" DROP COLUMN IF EXISTS "filter_label"`
  ).catch(() => {});
  console.log("  ✓ cleaned up old filter_key/filter_label columns");

  await pool.end();
  console.log("Done!");
}
run().catch(e => { console.error(e); process.exit(1); });
