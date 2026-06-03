/**
 * Seed test users for E2E and manual testing.
 * Run: npx tsx scripts/seed-test-users.ts
 *
 * Creates:
 *   - admin@test.com / TestPass123!  (ADMIN, no 2FA)
 *   - staff@test.com / TestPass123!  (STAFF, no 2FA)
 *   - customer@test.com              (CUSTOMER, no password — magic link only)
 */
import { Pool } from "pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
config();

const USERS = [
  { email: "admin@test.com", name: "Test Admin", role: "ADMIN", password: "TestPass123!" },
  { email: "staff@test.com", name: "Test Staff", role: "STAFF", password: "TestPass123!" },
  { email: "customer@test.com", name: "Test Customer", role: "CUSTOMER", password: null },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Test connection
  await pool.query("SELECT 1");
  console.log("✓ Database connected");

  for (const user of USERS) {
    let passwordHash: string | null = null;
    if (user.password) {
      passwordHash = await bcrypt.hash(user.password, 12);
    }

    const existing = await pool.query(
      `SELECT id, email, role FROM "user" WHERE email = $1`,
      [user.email],
    );

    if (existing.rows.length > 0) {
      // Update existing user
      await pool.query(
        `UPDATE "user" SET name = $1, role = $2, password_hash = COALESCE($3, password_hash) WHERE email = $4`,
        [user.name, user.role, passwordHash, user.email],
      );
      console.log(`✓ Updated: ${user.email} (${user.role})`);
    } else {
      // Create new user
      await pool.query(
        `INSERT INTO "user" (email, name, role, password_hash) VALUES ($1, $2, $3, $4)`,
        [user.email, user.name, user.role, passwordHash],
      );
      console.log(`✓ Created: ${user.email} (${user.role})`);
    }
  }

  await pool.end();
  console.log("\n✅ Test users seeded successfully!");
}

main().catch((e) => {
  console.error("✗ Failed:", e.message);
  process.exit(1);
});
