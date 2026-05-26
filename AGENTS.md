# Ig_ecomm — Computer Store E-commerce

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **Styling:** Tailwind CSS + shadcn/ui + Framer Motion
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **Auth:** NextAuth.js v5 with Prisma adapter
- **Email:** Resend + React Email
- **Deploy:** Vercel
- **Cost:** $0/month for MVP

## Project

**Name:** Ig_ecomm — a computer store e-commerce for "Infograf Store"
**Repo:** `git@github.com:ig-davideanezakis/ig_ecomm.git` (cloned at /root/ig_ecomm)
**Linear project:** https://linear.app/ig-ecomm/project/ig-ecomm-a56b8c556371
**Team key:** IG

## MVP Features

### Layout & Navigation
- Navbar (logo, categories, search, cart, login)
- Footer (contacts, links, social)
- Homepage (hero, featured categories, featured products, promos)
- Info pages (about, contacts, FAQ, privacy/terms)
- Custom 404

### Catalog
- Product listing with filters (category, brand, price)
- Product detail page with admin-editable rich HTML content
- Dynamic content (spec tables, gallery, video, custom sections)
- Scroll animations (parallax, reveal, transitions)
- Product search

### PC Configurator
- Interactive configurator: select CPU -> filter compatible components (RAM, GPU, motherboard, PSU, case)
- Killer feature for a computer store

### Cross-selling & Wishlist
- "Recommended accessories" on product pages
- Wishlist (save products for later)

### Reviews & Q&A
- Star + text reviews with admin moderation
- Questions & Answers (users ask, admin answers)

### Cart & Checkout
- Cart (add/remove/update quantity)
- Shipping cost calculation
- Checkout (address, payment method)
- Order confirmation email

### Users & Account
- Registration / Login (magic link, Google OAuth)
- Account area with order history
- Return/RMA request

### Admin Panel
- Dashboard with charts (daily sales, orders, low stock, revenue)
- Orders list, status updates, shipping tracking
- Product CRUD (categories, brands, images, variants)
- Rich-text HTML editor for product content
- Warehouse / stock tracking (low stock alerts, movements)
- Payment transactions & refunds
- Coupon codes management
- Email newsletter collection
- CSV/Excel order export
- Admin roles (ADMIN, WAREHOUSE, SUPPORT)

### Payments
- Card / PayPal integration (TBD which provider)
- Installment payments via Scalapay/Klarna (post-MVP)
- PDF invoice generation

### Blog & Content
- Blog / guides (e.g. "Best gaming PC under 1000€")
- SEO traffic driver

### SEO & Performance
- Meta tags, breadcrumbs, SEO-friendly URLs
- SSG/SSR for public pages
- Sitemap, robots.txt
- Lighthouse optimization

## Architectural Decisions

Living document at `docs/decisions/architecture.md` — one file per area, updated as decisions evolve. NOT incremental numbered ADRs.

### Technology Stack
- Next.js App Router full-stack (no separate backend)
- Supabase (PostgreSQL) + Prisma
- NextAuth.js for auth
- Tailwind CSS + Framer Motion
- Resend for email
- Vercel for deploy

### Database Models
Located in `prisma/schema.prisma`:
- User, Account, Session, VerificationToken (NextAuth)
- Category, Brand, Product, ProductVariant, ProductImage
- Review, Question
- Order, OrderItem
- Coupon, CouponProduct
- NewsletterSubscriber
- BlogPost
- WishlistItem
- StockMovement

### Key User Roles
```
CUSTOMER  — standard user
ADMIN     — full access
WAREHOUSE — stock management only
SUPPORT   — orders, returns, Q&A
```

### Order Workflow
```
PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
   \-> CANCELLED
```

### Return Workflow
```
REQUESTED -> APPROVED -> RECEIVED -> REFUNDED
         \-> REJECTED
```

## Team & Communication

- **PM / Stakeholder:** Davide Anezakis (ig-davideanezakis)
- **AI Agent role:** Lead Software Architect / tech executor — proposes solutions, implements code, pushes to GitHub, creates Linear issues
- **Language:** Chat with the PM is in **Italian**; all project files (MD, docs, code comments, commit messages) in **English**

## Workflow

- **Decision tracking:** Every architectural decision is in `docs/decisions/` as living documents (updated in place, not numbered ADRs)
- **Feature tracking:** Linear project `Ig_ecomm` (team key: IG) — issues for feature areas, not individual tasks
- **AI handoff:** AGENTS.md contains full context so any AI agent can pick up where the last one left off
- **Git flow:** Direct commits to `main` (single dev + PM, no PR workflow needed for MVP)
- **Cost constraint:** Everything must cost $0/month for MVP — no paid SaaS, no paid tiers
- **Scope:** MVP features listed above; all can grow post-MVP, feature list evolves constantly

## AI Agent Instructions

When onboarding to this project:
1. Read this AGENTS.md first
2. Read `docs/decisions/architecture.md` for architectural context
3. Check Linear project for issue status
4. Check `prisma/schema.prisma` for database model before building features
5. All new code: TypeScript, App Router, Tailwind CSS
6. Use Prisma for all database access
7. Admin routes under `/admin/*`
8. Public facing routes under `(shop)/` layout


## Project Structure (planned)

```
src/
  app/
    (shop)/           # Public routes
      page.tsx         # Homepage
      products/        # Catalog
      product/         # Product detail
      cart/            # Cart
      checkout/        # Checkout
      account/         # User account
      blog/            # Blog
    admin/             # Admin panel
      dashboard/
      products/
      orders/
      categories/
      brands/
      coupons/
      customers/
      blog/
      stock/
    api/               # API routes
      auth/            # NextAuth
      products/
      orders/
      cart/
      checkout/
      admin/
  components/
    ui/                # shadcn/ui components
    shop/              # Storefront components
    admin/             # Admin components
  lib/
    db.ts              # Prisma client
    auth.ts            # NextAuth config
    utils.ts           # Utilities
  generated/
    prisma/            # Prisma client
```

## Environment Variables Needed

```
DATABASE_URL=         # Supabase PostgreSQL connection string
DIRECT_URL=           # Supabase direct connection (for migrations)
AUTH_SECRET=          # NextAuth secret
AUTH_RESEND_KEY=      # Resend API key
RESEND_API_KEY=       # Resend API key (alt)
NEXT_PUBLIC_APP_URL=  # Deployed URL
```

## Current Status

- [x] Linear project created with all MVP feature issues
- [x] Architectural decisions document created and pushed
- [x] Next.js project initialized with TypeScript + Tailwind + Turbopack
- [x] Prisma schema with all models written
- [ ] Supabase project setup + DATABASE_URL configured
- [ ] Prisma migration run
- [ ] NextAuth.js configured
- [ ] shadcn/ui initialized
- [ ] Project structure scaffolded
- [ ] Payment provider decided
