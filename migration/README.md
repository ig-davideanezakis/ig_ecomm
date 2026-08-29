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

> **Table prefix:** the production store uses the `pr_` prefix (not PrestaShop's default `ps_`).
> The script reads the prefix from the `PS_PREFIX` env var and defaults to `pr_`.
> If your store uses the default prefix, run with `PS_PREFIX=ps_ npx tsx scripts/migrate.ts`.
>
> **Language:** localized rows (`*_lang` tables) are read with `PS_LANG_ID` (default `2` =
> Italiano). If your store's default language has a different `id_lang`, override it.
>
> **Duplicate slugs:** PrestaShop allows duplicate `link_rewrite` values. The script
> deduplicates slugs with a numeric suffix (`-2`, `-3`, …) and truncates to 250 chars,
> so the `slug` unique constraint is never violated.

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
| 8 | `ps_image` + `ps_image_lang` | `product_image` | Images downloaded from old store, uploaded to Supabase Storage (see below) |
| 9 | `ps_category` (images) | `category.image` | `/img/c/{id}.jpg` from old store → Supabase Storage |
| 10 | `ps_manufacturer` (logos) | `brand.logo` | `/img/m/{id}.jpg` from old store → Supabase Storage |
| 11 | Store logo | `store_setting['store_logo']` | `/img/logo.jpg` → Supabase Storage |
| 12 | CMS/static images | `product.content` (rewritten) | `/img/cms/…` URLs rewritten to Supabase public URLs |

## Image Migration (`migrate-images.ts`)

Run **after** `migrate.ts` so the PostgreSQL id maps exist:

```bash
npx tsx migration/scripts/migrate-images.ts
```

The script downloads every product/category/brand/CMS image from the old store and
uploads it to a **public Supabase Storage bucket** (default `product-images`), then
writes the public URLs into the database.

### How PrestaShop stores images

- **Files live on disk**, not in the DB: `/img/p/1/3/2/0/1320.jpg` (every digit of the
  image id becomes a subfolder), `/img/c/{id}.jpg` for categories, `/img/m/{id}.jpg`
  for brand logos, `/img/cms/…` for content images.
- The DB tables (`ps_image`, `ps_image_lang`, `ps_image_shop`) only hold metadata:
  `id_image`, `id_product`, `position`, `cover`, and the localized `legend` (alt text).
- Only the **original** (non-suffixed) image is migrated — `next/image` generates
  thumbnails on the fly, so PrestaShop's 5+ derived sizes (`-home_default`, etc.) are
  not needed.

### Cloudflare note (production store)

The old store (`www.infografstore.it`) sits behind Cloudflare with Bot Fight Mode.
Requests from this VPS are only allowed because of a WAF custom rule matching the
VPS **IPv4** (`178.105.54.77`). The script therefore forces IPv4 with `curl -4` —
do not remove that flag, or every request will get a 403 challenge.

### Env variables (image migration)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (Storage admin) |
| `SUPABASE_BUCKET` | No | Bucket name — default: `product-images` |
| `PS_SITE_URL` | No | Old store base URL — default: `https://www.infografstore.it` |
| `IMG_CONCURRENCY` | No | Parallel downloads — default: `8` |
| `DRY_RUN` | No | `1` = download URLs only, no uploads/DB writes |
| `FORCE` | No | `1` = re-upload even if a `product_image` row already exists |

The script is idempotent: re-running it skips images whose URLs are already in
`product_image` (pass `FORCE=1` to redo everything).

### Cover image & ordering

PrestaShop marks the default image with the `cover` flag, which is **independent of
`position`** (in this store, 432 of 1000 cover images are NOT at position 1). The
migration computes cover-first sort orders via `computeCoverFirstSortOrders()`, so
`product_image.sort_order` always places the cover image first, then the remaining
images in position order.

To fix the order of already-migrated images (e.g. from a run before this logic
existed), run:

```bash
npx tsx migration/scripts/fix-image-order.ts
```

### Aspect ratios & display

PrestaShop originals have very varied aspect ratios (~40% are not square, including
wide banner images). The shop UI uses `object-contain` in product cards and the
product detail gallery so images are never cropped.

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
3. **Migrate images** — `npx tsx migration/scripts/migrate-images.ts` (downloads from old store → Supabase Storage)
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
| `PS_PREFIX` | No | PrestaShop table prefix — default: `pr_` (production store) |
| `PS_LANG_ID` | No | Language ID for localized rows — default: `2` (Italiano in this store) |
| `DATABASE_URL` | Yes | Supabase PostgreSQL URL |
