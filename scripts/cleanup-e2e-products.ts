/**
 * Delete E2E test products left behind in the (shared) database by local and
 * CI Playwright runs.
 *
 * The specs create products through /api/admin/products with recognizable
 * titles (Monitor E2E …, Notebook Chip E2E …, Prodotto E2E …). Run this after
 * any E2E session — mirror of scripts/cleanup-test-users.ts for users.
 *
 * Run: npm run db:cleanup-products
 */
import { Pool } from "pg";
import { config } from "dotenv";
config();

// Title patterns used by the E2E specs when creating products via API.
const TITLE_PATTERNS = [
  "Monitor E2E%",
  "Notebook Chip E2E%",
  "Chip E2E%",
  "Prodotto E2E%",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const where = TITLE_PATTERNS.map((_, i) => `title ILIKE $${i + 1}`).join(" OR ");
  const params = TITLE_PATTERNS;

  const before = await pool.query(`SELECT COUNT(*)::int AS total FROM product WHERE ${where}`, params);
  console.log(`Found ${before.rows[0].total} E2E product(s) to clean.`);

  if (before.rows[0].total > 0) {
    const result = await pool.query(
      `DELETE FROM product WHERE ${where} RETURNING id`,
      params,
    );
    console.log(`✅ Deleted ${result.rowCount} E2E product(s).`);
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error("Cleanup error:", err.message);
  await pool.end();
  process.exit(1);
});
