# PrestaShop → ig_ecomm — Data Migration

Migrate data from an existing PrestaShop 1.7.7.8 e-commerce to the ig_ecomm Next.js platform.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   PrestaShop    │         │    ig_ecomm      │
│   MySQL 8.0     │  ───→   │   PostgreSQL     │
│   (Docker)      │  migrate│   (Supabase)     │
│   port 3307     │         │   DATABASE_URL   │
└─────────────────┘         └─────────────────┘
```

## Setup

### 1. Start MySQL container

```bash
cd migration
docker compose up -d
```

This starts MySQL 8.0 on port `3307` with:
- Database: `prestashop`
- User: `prestashop` / `prestashop_pass`
- Root: `prestashop_root`
- Container name: `prestashop-source`
- `mysql-init/` SQL files are auto-imported on first run (utf8mb4 charset)

### 2. Load PrestaShop data

Load your PrestaShop SQL dump into the container:

```bash
# If you have a .sql dump file:
docker exec -i prestashop-source mysql -u root -pprestashop_root prestashop < /path/to/your/dump.sql
```

Or put the dump file in `mysql-init/` before starting the container (it will be auto-imported on first run).

> ⚠️ **Never commit production dumps** — they can be hundreds of MB.
> The `.gitignore` keeps everything under `migration/mysql-init/` local except the
> structural schema (`01-prestashop-schema.sql`). If you add a dump, verify with
> `git status` that only intended files are staged.

### 3. Run migration

`mysql2` is already a project dependency — no install needed.

```bash
cd migration
npx tsx scripts/migrate.ts
```

The script requires `DATABASE_URL` (from the project `.env`) and defaults for MySQL
connection (override via `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).

## What Gets Migrated

| # | PrestaShop Table | ig_ecomm Table | Notes |
|---|-----------------|----------------|-------|
| 1 | `ps_manufacturer` | `brand` | Slug auto-generated, description from lang |
| 2 | `ps_category` + `ps_category_lang` | `category` | Hierarchical via `parent_id`, slug from `link_rewrite` |
| 3 | `ps_product` + `ps_product_lang` | `product` | Content = short_desc + long_desc, prices converted |
| 4 | `ps_product_attribute` | `product_variant` | Variant price = base + impact, stock included |
| 5 | `ps_stock_available` | `product_variant` | Simple products get a "Default" variant with stock |
| 6 | `ps_customer` | `user` | Role = CUSTOMER, password not migrated (reset required) |
| 7 | `ps_customer (newsletter)` | `newsletter_subscriber` | Also checks `ps_emailsubscription` if exists |

## Not Migrated (post-MVP)

| Feature | Reason |
|---------|--------|
| Orders & Order Details | Requires matching product IDs after migration |
| Specific Prices (discounts) | Coupon system TBD |
| Tags | `ps_tag` → product tags (not yet implemented) |
| Customization fields | Not supported in current product model |
| Attachments / Downloads | Digital products post-MVP |
| Cart sessions | Abandoned carts not useful post-migration |
| Addresses | `ps_address` → user saved addresses (IG-13) |
| Feature filters | `ps_feature` → dynamic filter options (partial) |

## Post-Migration Steps

1. **Generate SEO metadata** — Use the AI "Formatta SEO" button per product
2. **Assign category filters** — Go to Admin → Categorie → [edit] → Filtri
3. **Upload product images** — Use the admin product form image gallery
4. **Create admin user** — `npm run db:seed-admin`
5. **Verify pricing** — Check a sample of products have correct prices
6. **Rebuild search index** — The PostgreSQL ILIKE search works immediately

## Env Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MYSQL_HOST` | No | Default: `127.0.0.1` |
| `MYSQL_PORT` | No | Default: `3307` |
| `MYSQL_USER` | No | Default: `prestashop` |
| `MYSQL_PASSWORD` | No | Default: `prestashop_pass` |
| `MYSQL_DATABASE` | No | Default: `prestashop` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL URL |
