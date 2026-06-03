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
│       └── scope.md             # MVP boundaries
├── drizzle/                     # Drizzle Kit migration files
├── drizzle.config.ts            # Drizzle Kit configuration
├── src/
│   ├── app/
│   │   ├── (shop)/              # Public storefront routes
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── products/        # Catalog listing + filters
│   │   │   ├── product/         # Product detail [slug]
│   │   │   ├── cart/            # Cart page
│   │   │   ├── checkout/        # Checkout flow
│   │   │   ├── account/         # User account (orders, wishlist, returns)
│   │   │   └── blog/            # Blog / guides
│   │   ├── admin/               # Admin panel (all protected)
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── categories/
│   │   │   ├── brands/
│   │   │   ├── coupons/
│   │   │   ├── customers/
│   │   │   ├── blog/
│   │   │   └── stock/
│   │   ├── api/                 # API routes
│   │   │   ├── auth/            # NextAuth handlers
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   └── admin/
│   │   └── layout.tsx           # Root layout
│   ├── db/                      # Database schema & client
│   │   └── schema/              # Drizzle ORM schema definitions
│   │       ├── index.ts         # Re-exports all schema files
│   │       ├── auth.ts          # Auth tables (user, account, session, verification_token)
│   │       └── store.ts         # E-commerce tables (product, category, brand, order, etc.)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   └── shop/                # Storefront components
│   ├── lib/
│   │   ├── db.ts                # Drizzle ORM client (drizzle instance + pg Pool)
│   │   ├── auth.ts              # NextAuth configuration
│   │   └── utils.ts             # Shared utilities (cn, formatters)
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
- **Forms:** React Hook Form + Zod validation
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

- Server state: fetched in Server Components or React Query (for client data)
- Client state: Zustand for global cart, auth state if needed
- URL state: search params for filters, pagination

## Auth Pattern

- Public pages: no auth check (catalog, product pages, blog)
- Account pages: redirect to login if not authenticated
- Admin routes: check `user.role === 'ADMIN'` (or WAREHOUSE/SUPPORT for specific sections)
- API routes: validate session via NextAuth `getServerSession()`
