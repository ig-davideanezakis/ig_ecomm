import "dotenv/config";
import { readFileSync } from "fs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const sql = readFileSync("drizzle/0000_romantic_raider.sql", "utf-8");
  const statements = sql.split("--> statement-breakpoint");

  let applied = 0, skipped = 0, errors = 0;

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    try {
      await pool.query(trimmed);
      applied++;
      console.log(`  ✓ ${trimmed.substring(0, 70)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        skipped++;
      } else {
        errors++;
        console.log(`  ✗ ${msg.substring(0, 200)}`);
      }
    }
  }

  console.log(`\nApplied: ${applied}, Skipped: ${skipped}, Errors: ${errors}`);
  await pool.end();
}

main().catch(console.error);
