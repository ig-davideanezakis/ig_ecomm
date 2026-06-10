import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint WHERE conrelid = 'category_filter'::regclass
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
