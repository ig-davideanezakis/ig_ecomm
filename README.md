# ig_ecomm — Infograf Store

Full-stack e-commerce platform for **Infograf** (Palermo, IT — since 1992), built with Next.js.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Storage | Supabase Storage (bucket `product-images`, public) |
| Auth | Auth.js v5 (NextAuth) — Google OAuth, Email + Password, token reset, 2FA (TOTP) |
| Email | Resend |
| Deploy | Vercel (via GitHub Actions CI/CD) |
| Tests | Vitest (unit/component) + Playwright (E2E + aXe accessibility) |

## Getting Started

### Prerequisites

- Node.js 22
- A Supabase project (PostgreSQL + Storage)
- A Resend API key (email)
- A Google OAuth client (optional, for Google login)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# fill in the values (see .env.example for the full list)

# 3. Push the DB schema (requires DATABASE_URL + DIRECT_URL)
npx drizzle-kit push

# 4. Seed the database (admin user, filters, settings)
npm run db:seed-admin
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `DIRECT_URL` | Yes | Same as DATABASE_URL (Drizzle migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server-side only, never expose to the client** |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Yes | Deployed URL (e.g. `https://ig-ecomm.vercel.app`) |
| `AUTH_RESEND_KEY` | Yes | Resend API key (magic links, emails) |
| `DEEPSEEK_API_KEY` | No | AI SEO formatting (DeepSeek) in admin |
| `ICECAT_KEY` / `ICECAT_USERNAME` | No | Icecat product data lookup by EAN |
| `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE` | No | PrestaShop migration source (defaults in `migration/README.md`) |
| `PS_PREFIX` / `PS_LANG_ID` | No | PrestaShop table prefix (`pr_` in production) + language id (`2` = Italiano) |
| `PS_SITE_URL` | No | Old PrestaShop store base URL (image migration download source) |
| `SUPABASE_BUCKET` | No | Image migration bucket — default `product-images` |
| `IMG_CONCURRENCY` / `DRY_RUN` / `FORCE` | No | Image migration tuning (see `migration/README.md`) |

## Product Images & Storage

Product images are stored in **Supabase Storage** in the public bucket `product-images`:

- The bucket is **auto-created on first upload** (`ensureBucket()` in `src/lib/supabase-admin.ts`)
- Upload via `POST /api/admin/upload` (multipart, ADMIN only): JPG/PNG/WebP/AVIF, max **5MB**
- Files are stored at `products/{productId}/{timestamp}-{random}.{ext}` with 1-year cache
- The DB (`product_image` table) stores only the public URL — the DB is the source of truth
- `DELETE /api/admin/upload?id=xxx` removes both the DB record and the storage object
- External URLs (e.g. from Icecat) can also be saved as image references via the JSON fallback

See `docs/guides/admin-products.md` for the full admin flow.

**PrestaShop migration**: `migration/scripts/migrate-images.ts` downloads images from
the old store (`PS_SITE_URL`) and uploads them to the same `product-images` bucket —
see `migration/README.md` for the full image migration guide (cover ordering,
Cloudflare/IPv4 notes, `fix-image-order.ts`).

## Project Structure

```
src/
  app/            → Routes (shop, admin, auth, api)
  components/     → UI components (admin/, shop/, ui/)
  db/             → Drizzle schema + queries
  lib/            → Utilities (auth, storage, icecat, db, utils)
  proxy.ts        → Edge middleware (session check)
migration/        → PrestaShop → ig_ecomm data migration (see migration/README.md)
e2e/              → Playwright tests (E2E + a11y)
docs/             → Project documentation (guides, decisions)
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:run` | Unit/component tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `./scripts/test.sh` | Full local test suite (creates/uses repo `.venv`, pins Python 3.11-3.13) |

## CI/CD

GitHub Actions runs on every push to `main`:

```
lint → test → build → e2e (→ cleanup users + products) → deploy (Vercel)
                       ↘ a11y (aXe)
```

The deploy job only runs if **all** of lint, test, build and e2e pass. Required GitHub secrets: `DATABASE_URL`, `AUTH_SECRET`, `VERCEL_DEPLOY_HOOK`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` (see `.github/workflows/ci.yml`).

## Documentation

- `docs/guides/` — feature-specific guides (admin, testing, accessibility, behavior, roadmap)
- `docs/decisions/architecture.md` — architectural decisions (living document)
- `migration/README.md` — PrestaShop data migration instructions

## Contributing

See `AGENTS.md` and `docs/guides/` before making changes.
