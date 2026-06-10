import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Creating filter tables...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "filter" (
      "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(255) NOT NULL,
      "slug" varchar(255) NOT NULL UNIQUE,
      "type" varchar(50) NOT NULL DEFAULT 'checkbox',
      "is_global" boolean NOT NULL DEFAULT false,
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT NOW(),
      "updated_at" timestamp NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ filter");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "filter_option" (
      "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      "value" varchar(255) NOT NULL,
      "label" varchar(255),
      "slug" varchar(255),
      "color" varchar(50),
      "sort_order" integer NOT NULL DEFAULT 0,
      "filter_id" varchar(255) NOT NULL REFERENCES "filter"(id) ON DELETE CASCADE
    )
  `);
  console.log("  ✓ filter_option");

  await pool.query(`ALTER TABLE "category_filter" ADD COLUMN IF NOT EXISTS "filter_id" varchar(255) REFERENCES "filter"(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE "category_filter" ADD COLUMN IF NOT EXISTS "inherit" boolean NOT NULL DEFAULT true`);
  console.log("  ✓ category_filter updated");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "product_filter_value" (
      "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      "product_id" varchar(255) NOT NULL,
      "filter_id" varchar(255) NOT NULL REFERENCES "filter"(id) ON DELETE CASCADE,
      "value" varchar(255) NOT NULL,
      "filter_option_id" varchar(255) REFERENCES "filter_option"(id) ON DELETE CASCADE,
      UNIQUE("product_id", "filter_id", "value")
    )
  `);
  console.log("  ✓ product_filter_value");

  // Seed global filters
  const existing = await pool.query(`SELECT COUNT(*)::int as count FROM "filter"`);
  if (existing.rows[0].count === 0) {
    const res = await pool.query(`
      INSERT INTO "filter" (name, slug, type, is_global, sort_order) VALUES
        ('Prezzo', 'price', 'range', true, 1),
        ('Disponibilità', 'stock', 'checkbox', true, 2),
        ('Marca', 'brand', 'checkbox', true, 3)
      RETURNING id, slug
    `);
    console.log("  ✓ seeded global filters");

    for (const row of res.rows) {
      if (row.slug === 'stock') {
        await pool.query(`
          INSERT INTO "filter_option" (value, label, slug, filter_id) VALUES
            ('in_stock', 'Disponibile', 'in_stock', $1),
            ('out_of_stock', 'Non disponibile', 'out_of_stock', $2),
            ('on_sale', 'In offerta', 'on_sale', $3)
        `, [row.id, row.id, row.id]);
        console.log("  ✓ seeded stock options");
      }
    }
  } else {
    console.log("  - already seeded");
  }

  console.log("\n✅ Migration complete!");
  await pool.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
