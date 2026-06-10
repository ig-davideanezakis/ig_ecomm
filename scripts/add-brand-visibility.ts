import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Adding brand visibility columns...");
  await pool.query(`ALTER TABLE "brand" ADD COLUMN IF NOT EXISTS "show_in_home" boolean NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE "brand" ADD COLUMN IF NOT EXISTS "show_in_footer" boolean NOT NULL DEFAULT false`);
  console.log("✓ show_in_home + show_in_footer columns added");
  await pool.end();
  console.log("Done!");
}
run().catch(e => { console.error(e); process.exit(1); });
