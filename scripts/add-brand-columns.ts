import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Adding brand columns...");
  await pool.query(`ALTER TABLE "brand" ADD COLUMN IF NOT EXISTS "description" text`);
  await pool.query(`ALTER TABLE "brand" ADD COLUMN IF NOT EXISTS "website" varchar(500)`);
  console.log("✓ description + website columns added");
  await pool.end();
  console.log("Done!");
}
run().catch(e => { console.error(e); process.exit(1); });
