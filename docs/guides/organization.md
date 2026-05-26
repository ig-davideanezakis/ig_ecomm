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
├── prisma/
│   └── schema.prisma            # Database models
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
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── shop/                # Storefront components
│   │   └── admin/               # Admin panel components
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── auth.ts              # NextAuth configuration
│   │   └── utils.ts             # Shared utilities (cn, formatters)
│   └── generated/
│       └── prisma/              # Auto-generated Prisma client
```

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

- Always use Prisma (`import { prisma } from "@/lib/db"`)
- No raw SQL queries unless absolutely necessary
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
