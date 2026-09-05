/**
 * One-time data fix: legacy "Default" product variants (PrestaShop migration)
 * carry price 0 while the real price lives in product.base_price — which made
 * the storefront display €0,00 (variant price wins over base in the queries).
 *
 * Sets price = base_price for variants named "Default" with price 0 on
 * products whose base price is set. Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/fix-default-variant-prices.ts
 */
import { Pool } from "pg";
import { config } from "dotenv";
config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const updated = await pool.query(
    `UPDATE "product_variant" v
       SET price = p."base_price"
     FROM "product" p
     WHERE v."product_id" = p.id
       AND v.name = 'Default'
       AND v.price = 0
       AND p."base_price" > 0`,
  );
  console.log(`✓ Updated ${updated.rowCount ?? 0} default variant(s) to inherit the base price.`);

  const residual = await pool.query(
    `SELECT COUNT(*)::int AS n,
            COUNT(*) FILTER (WHERE name = 'Default')::int AS default_zero
     FROM "product_variant" WHERE price = 0`,
  );
  console.log(`Residual price-0 variants: ${residual.rows[0].n} (of which 'Default': ${residual.rows[0].default_zero})`);

  await pool.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
