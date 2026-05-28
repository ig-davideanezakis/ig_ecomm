#!/usr/bin/env tsx

/**
 * Seed: Create the first admin user in the database.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts <email>
 *
 * Example:
 *   npx tsx scripts/seed-admin.ts davide.anezakis@gmail.com
 *
 * This creates a user with ADMIN role that can authenticate via magic link
 * (once Resend is configured). Run it from an environment that can reach
 * the Supabase database (Vercel CLI, Supabase dashboard SQL editor, etc.).
 */

import { Pool } from "pg";

const email = process.argv[2];

if (!email || !email.includes("@")) {
  console.error("Usage: npx tsx scripts/seed-admin.ts <email>");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error("Ensure you have a .env file with DATABASE_URL or set it in the environment.");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Check if user already exists
    const existing = await pool.query(
      `SELECT id, email, role FROM "User" WHERE email = $1`,
      [email],
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.role === "ADMIN") {
        console.log(`✓ User ${email} is already an ADMIN (id: ${user.id})`);
      } else {
        // Promote to ADMIN
        await pool.query(
          `UPDATE "User" SET role = 'ADMIN' WHERE id = $1`,
          [user.id],
        );
        console.log(`✓ User ${email} promoted to ADMIN (was: ${user.role})`);
      }
    } else {
      // Create new user with ADMIN role
      const result = await pool.query(
        `INSERT INTO "User" (email, role) VALUES ($1, 'ADMIN') RETURNING id`,
        [email],
      );
      console.log(`✓ Admin user created: ${email} (id: ${result.rows[0].id})`);
    }

    console.log("\nNext steps:");
    console.log("  1. Configure AUTH_RESEND_KEY in .env and Vercel env vars");
    console.log("  2. Sign in at https://your-domain.vercel.app/auth/login");
    console.log("  3. You'll receive a magic link via email");
    console.log("  4. Access admin at https://your-domain.vercel.app/admin/dashboard");
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
