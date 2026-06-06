/**
 * Cleanup test users created during E2E tests.
 * Run: npx tsx scripts/cleanup-test-users.ts
 *
 * Deletes all users whose email matches known E2E prefixes.
 */
import { Pool } from "pg";
import { config } from "dotenv";
config();

const PREFIXES = ["e2e-"];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
  } catch {
    console.log("⚠ Database not available — skipping cleanup.");
    process.exit(0);
  }

  let totalDeleted = 0;
  for (const prefix of PREFIXES) {
    const result = await pool.query(
      `DELETE FROM "user" WHERE email LIKE $1`,
      [`${prefix}%`],
    );
    if (result.rowCount && result.rowCount > 0) {
      totalDeleted += result.rowCount;
      console.log(`✓ Deleted ${result.rowCount} users matching "${prefix}*"`);
    }
  }

  if (totalDeleted === 0) {
    console.log("✓ No test users to clean up.");
  } else {
    console.log(`\n✅ Cleanup complete: ${totalDeleted} test user(s) removed.`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error("✗ Cleanup failed:", e.message);
  process.exit(1);
});
