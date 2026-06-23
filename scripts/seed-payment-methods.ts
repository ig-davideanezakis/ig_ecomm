import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Seeding default payment methods...");
  await pool.query(`
    INSERT INTO store_setting (key, value) VALUES ('payment_methods', 'card\nbonifico\ncontanti\nbancomat')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  console.log("✓ payment_methods seeded: card, bonifico, contanti, bancomat");
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
