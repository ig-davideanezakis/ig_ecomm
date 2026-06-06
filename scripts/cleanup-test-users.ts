/**
 * Cleanup test users created during E2E tests.
 * Run: npx tsx scripts/cleanup-test-users.ts
 *
 * Deletes:
 *   - Users with email matching known E2E prefixes (e2e-*)
 *   - Seed test users (admin, staff, customer @test.com)
 *   - Any Google OAuth test accounts linked to these users
 */
import { Pool } from "pg";
import { config } from "dotenv";
config();

const PREFIXES = ["e2e-"];

// Seed test users created by seed-test-users.ts
const SEED_EMAILS = [
  "admin@test.com",
  "staff@test.com",
  "customer@test.com",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
  } catch {
    console.log("⚠ Database not available — skipping cleanup.");
    process.exit(0);
  }

  let totalDeleted = 0;

  // Delete prefix-matched users
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

  // Delete seed test users and their linked accounts
  for (const email of SEED_EMAILS) {
    // Delete linked OAuth accounts (cascade-safe: delete accounts first)
    await pool.query(
      `DELETE FROM "account" WHERE "userId" = (SELECT id FROM "user" WHERE email = $1)`,
      [email],
    );
    // Delete sessions
    await pool.query(
      `DELETE FROM "session" WHERE "userId" = (SELECT id FROM "user" WHERE email = $1)`,
      [email],
    );
    // Delete verification tokens for this identifier
    await pool.query(
      `DELETE FROM verification_token WHERE identifier = $1`,
      [email],
    );
    // Delete the user
    const result = await pool.query(
      `DELETE FROM "user" WHERE email = $1`,
      [email],
    );
    if (result.rowCount && result.rowCount > 0) {
      totalDeleted += result.rowCount;
      console.log(`✓ Deleted seed user: ${email}`);
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
