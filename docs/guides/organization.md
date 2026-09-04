# Organization — Project Structure & Conventions

## Directory Structure

```
ig_ecomm/
├── AGENTS.md                    # Project index (start here)
├── docs/
│   ├── decisions/
│   │   └── architecture.md      # Stack & architectural decisions
│   └── guides/
│       ├── behaviour.md         # Roles, workflow, operating model
│       ├── organization.md      # This file — structure & conventions
│       ├── features.md          # MVP feature list
│       ├── scope.md             # MVP boundaries
│       └── accessibility.md     # EAA compliance & WCAG
├── drizzle/                     # Drizzle Kit migration files
├── drizzle.config.ts            # Drizzle Kit configuration
├── scripts/                     # Utility scripts (seed, migrate, check)
│   ├── seed-admin.ts            # Create/promote admin user
│   ├── seed-test-users.ts       # Seed E2E test users
│   ├── cleanup-test-users.ts    # Delete E2E test users created during runs
│   ├── promote-admin.ts         # Promote user to ADMIN role
│   ├── init-db.ts               # Full DB init + migration
│   └── check-deployment.js      # Vercel deployment monitor
├── e2e/                         # Playwright E2E tests
│   ├── auth.spec.ts             # Auth flows (login, register, forgot-password, logout, roles, API)
│   ├── admin.spec.ts            # Admin redirect tests
│   ├── admin-a11y.spec.ts       # Authenticated aXe scans (product page, Icecat dialog, lightbox)
│   ├── admin-products.spec.ts   # Admin products CRUD + Icecat dialog
│   ├── product-page.spec.ts     # PDP: JSON-LD, sticky bar, gallery/lightbox
│   ├── scroll-top.spec.ts       # "Torna su" button (shop + admin)
│   ├── spec-chips.spec.ts       # Spec chips on PDP and cards
│   ├── smoke.spec.ts            # Core smoke tests
│   ├── theme.spec.ts            # Theme toggle tests
│   └── accessibility.spec.ts    # aXe-core WCAG scans (public pages)
├── vercel.json                  # Vercel config
├── src/
│   ├── app/
│   │   ├── (shop)/              # Public storefront routes
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── products/        # Catalog listing + filters
│   │   │   ├── product/         # Product detail [slug]
│   │   │   ├── cart/            # Cart page
│   │   │   ├── checkout/        # Checkout flow
│   │   │   ├── account/         # User account (orders, wishlist, returns)
│   │   │   ├── blog/            # Blog / guides
│   │   │   ├── auth/            # Auth pages (login, verify-2fa, error)
│   │   │   └── shop-navbar.tsx  # Client navbar with session + logout
│   │   ├── admin/               # Admin panel (all protected)
│   │   │   ├── dashboard/       # Dashboard + revenue chart
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── categories/
│   │   │   ├── brands/
│   │   │   ├── coupons/
│   │   │   ├── customers/       # User management (CRUD + roles)
│   │   │   ├── blog/
│   │   │   ├── stock/
│   │   │   ├── security/        # 2FA + password settings
│   │   │   ├── admin-header.tsx # Header with user info + logout
│   │   │   └── admin-sidebar.tsx# Sidebar with active route highlight
│   │   ├── api/
│   │   │   ├── auth/            # NextAuth + custom auth APIs
│   │   │   │   ├── [...nextauth]/ # NextAuth route handler
│   │   │   │   ├── check-email/ # Detect user role by email
│   │   │   │   ├── register/    # Create CUSTOMER account (email + password)
│   │   │   │   ├── forgot-password/ # Generate reset token, send email
│   │   │   │   ├── reset-password/  # Verify token, update password
│   │   │   │   ├── set-password/# Set/change password (authenticated)
│   │   │   │   ├── totp-setup/  # Generate TOTP secret + QR code
│   │   │   │   └── verify-totp/ # Verify TOTP token
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   └── admin/
│   │   │       ├── dashboard/revenue/  # Revenue chart data
│   │   │       └── users/             # User CRUD (ADMIN only)
│   │   └── layout.tsx           # Root layout
│   ├── db/                      # Database schema & client
│   │   ├── queries/
│   │   │   ├── index.ts         # Re-exports
│   │   │   ├── products.ts      # Product queries (raw SQL)
│   │   │   └── dashboard.ts     # Dashboard stats queries
│   │   └── schema/
│   │       ├── index.ts         # Re-exports all schema files
│   │       ├── auth.ts          # Auth tables (user, account, session, verification_token)
│   │       └── store.ts         # E-commerce tables (product, category, brand, order, etc.)
│   ├── components/
│   │   ├── __tests__/           # Component + utility tests (.test.tsx / .test.ts)
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── shop/                # Storefront components
│   │   ├── totp-setup.tsx       # 2FA setup UI
│   │   ├── password-setup.tsx   # Password setup UI
│   │   └── providers.tsx        # Theme + Session providers
│   ├── lib/
│   │   ├── db.ts                # Drizzle ORM client (drizzle instance + pg Pool)
│   │   ├── auth.ts              # NextAuth configuration
│   │   ├── auth-helpers.ts      # authorize() helper for route protection
│   │   ├── totp.ts              # TOTP secret, QR code, verification
│   │   └── utils.ts             # Shared utilities (cn, formatters)
│   ├── proxy.ts                 # Edge middleware (session cookie check)
│   └── types/
│       └── next-auth.d.ts       # NextAuth type augmentation
```

## Database Convention

**All table names and column names use `snake_case`.** PostgreSQL folds unquoted identifiers to lowercase, but Drizzle ORM generates quoted identifiers for case-sensitive matching. Using snake_case consistently avoids mismatches between the Drizzle schema, Auth.js adapter, and raw SQL queries.

| PascalCase (old — DO NOT USE) | snake_case (current)          |
|-------------------------------|------------------------------|
| `"User"`, `"Account"`         | `"user"`, `"account"`        |
| `"Product"`, `"ProductVariant"` | `"product"`, `"product_variant"` |
| `"basePrice"`, `"createdAt"`  | `"base_price"`, `"created_at"`  |

**Always reference table/column names with quotes in raw SQL queries** (e.g. `SELECT * FROM "product" WHERE "base_price" > 10`). Without quotes, PostgreSQL folds to lowercase so `"product"`, `product`, and `PRODUCT` all work; with quotes the casing must match exactly.

## Coding Conventions

- **Language:** TypeScript everywhere (strict mode)
- **Components:** Functional components, no class components
- **Imports:** Use `@/` alias (e.g. `@/lib/db`, `@/components/ui/button`)
- **CSS:** Tailwind utility classes. Custom CSS only as a last resort.
- **Animations:** Framer Motion for scroll/UI animations
- **Forms:** Zod for schema validation (client + server)
- **API routes:** Next.js Route Handlers (`route.ts`)
- **Server Components by default** — only add `'use client'` when you need browser APIs, event handlers, or hooks

## Database Access

- Always use Drizzle (`import { db } from "@/lib/db"`)
- Write queries with Drizzle's type-safe query builder:
  ```ts
  import { db } from "@/lib/db";
  import { products, categories } from "@/db/schema";
  import { eq, like, and, gte, lte } from "drizzle-orm";

  const result = await db
    .select()
    .from(products)
    .where(eq(products.published, true))
    .limit(12);
  ```
- For complex queries (nested JSON, aggregations), use `db.execute(sql\`...\`)` with raw SQL
- Server Components can query the DB directly (no API needed for internal reads)
- Mutations go through either API routes (client-side) or Server Actions (form submissions)

## State Management

- Server state: fetched in Server Components (no client-side data-fetching library)
- Cart state: React Context + `useReducer`, persisted to `localStorage` (`src/lib/cart-store.tsx`)
- URL state: search params for filters, pagination

## Auth Pattern

- **Public pages:** no auth check (catalog, product pages, blog)
- **Account pages:** redirect to login if not authenticated
- **Admin routes:** `authorize("ADMIN")` in layout (checks role + 2FA)
- **Staff routes:** `authorize("STAFF")` in layout (checks role + 2FA)
- **API routes:** validate session via `auth()` from `@/lib/auth`
- **Role hierarchy:** CUSTOMER (0) → STAFF (1) → ADMIN (2). Higher role inherits lower access.
- **2FA enforcement:** STAFF and ADMIN roles require TOTP if enabled. Checked via `needsTotp` flag in JWT.
- **Authentication methods:**
  - CUSTOMER: Google OAuth or Email + Password (self-registration)
  - STAFF/ADMIN: Password + TOTP 2FA (created via DB only, not via registration)
- **Password reset:** All roles can reset password via email-based token flow.
  Token (crypto.randomBytes(32)) stored in `verification_token` table, 1h expiry.
- **Registration flow:** Enter email → if not found → one-step form (password only) → auto-login
- **Guest access:** GUEST is an implicit role for unauthenticated users (not stored in DB)
