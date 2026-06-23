import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Creating order_status_log table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "order_status_log" (
      id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id varchar(255) NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
      from_status varchar(50) NOT NULL,
      to_status varchar(50) NOT NULL,
      changed_by varchar(50) DEFAULT 'system',
      created_at timestamp NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ order_status_log table created");
  await pool.end();
  console.log("Done!");
}
run().catch(e => { console.error(e); process.exit(1); });
