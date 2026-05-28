#!/usr/bin/env tsx

/**
 * Promote a user to ADMIN role.
 *
 * Usage:
 *   npx tsx scripts/promote-admin.ts <email>
 *
 * Example:
 *   npx tsx scripts/promote-admin.ts davide.anezakis@gmail.com
 *
 * The user must already exist in the database (signed up via magic link).
 */

import { Pool } from "pg";

const email = process.argv[2];

if (!email || !email.includes("@")) {
  console.error("Usage: npx tsx scripts/promote-admin.ts <email>");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const result = await pool.query(
      `UPDATE "User" SET role = 'ADMIN' WHERE email = $1 RETURNING id, email, role`,
      [email],
    );

    if (result.rows.length === 0) {
      console.error(`✗ User not found: ${email}`);
      console.error("  The user must sign up first via the login page,");
      console.error("  or you can create a user directly in Supabase SQL Editor:");
      console.error(`  INSERT INTO "User" (email, role) VALUES ('${email}', 'ADMIN');`);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log(`✓ User ${user.email} promoted to ${user.role}`);
  } catch (error) {
    console.error("Error promoting user:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
