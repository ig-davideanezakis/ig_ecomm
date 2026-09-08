# Roadmap — ig_ecomm (Infograf Store)

> Living document. Owner: Davide Anezakis (PM) + AI agent (architect/executor).
> Last updated: 2026-09-08.
> Sources of truth: `AGENTS.md`, `docs/guides/features.md`, `docs/guides/scope.md`,
> `docs/decisions/architecture.md`, and the Linear project `IG-Ecomm`.

This document turns the MVP feature list into a prioritized, phased plan and
tracks the known technical debt. Feature areas without a `Status` line in
`features.md` are **not built yet** and appear here as backlog.

---

## 0. Immediate fixes (correctness & tech debt)

### Resolved since the last update (this session)

A full-project audit (docs + code) found and fixed:

- **Checkout trusted the client-supplied item price** and never checked
  whether the guarded stock `UPDATE` actually matched a row — a manipulated
  `price` in the request body was accepted as-is, and a stock shortfall
  silently produced a confirmed order with no stock ever decremented (and no
  transaction, so a mid-cart failure left partial writes committed). Now
  priced server-side from `product_variant` (row-locked `FOR UPDATE`) inside
  a single DB transaction. `src/app/api/checkout/route.ts`.
- **Cancelling an order never restored the stock reserved at checkout** —
  every cancellation permanently under-counted inventory. Now restored
  atomically with the status change. `src/app/api/admin/orders/[id]/status/route.ts`.
- **Post-purchase "Crea account" on the thank-you page always failed** — the
  client sent an empty `email` with a comment saying the API would look it
  up from the order, but the API never did and rejected the empty string.
  The email is now resolved server-side from the order's `billing_email`.
  `src/app/api/auth/register-from-order/route.ts`.
- **`.env.example` never existed in the repo** — README's setup steps say
  `cp .env.example .env`, but `.gitignore`'s blanket `.env*` pattern excluded
  it from every commit, including the ones that documented it. Added the
  file + a `.gitignore` exception.
- **STAFF-role login/2FA redirected to `/staff`, which didn't exist** (404).
  `architecture.md`/`organization.md` already documented a
  `authorize("STAFF")`-gated `/staff/*` layout; it was never built. Added the
  layout + a placeholder page.
- **Homepage "Contattaci" button was a dead `href="#"` link** — now anchors
  to the footer's contacts block.
- **`groq-sdk` unused dependency removed** (AI SEO calls DeepSeek directly).
- **Doc drift**: `features.md` listed WAREHOUSE/SUPPORT roles that don't
  exist (actual: CUSTOMER/STAFF/ADMIN); `features.md`/`guest-checkout.md`
  claimed order-confirmation emails are sent — `/api/checkout` has no
  email-sending code at all; `features.md` claimed a contact form exists —
  it doesn't; `architecture.md`'s role-hierarchy numbers didn't match
  `auth-helpers.ts`; `testing.md`'s e2e spec list named a removed spec file
  and was missing three that exist; `admin-products.md` had one line
  duplicated 3×; `brand.md` had a broken table.

### Still open

| # | Issue | Evidence | Action |
|---|-------|----------|--------|
| 0.1 | **Homepage still doesn't scroll — no featured content.** The dead "Contattaci" link is fixed, but `(shop)/page.tsx` still renders only the hero + `BrandLogoWidget`; with `show_brand_widget_home=false` (current DB setting) the page is exactly viewport-height. `features.md` claims featured categories/products/promotions as done. | `src/app/(shop)/page.tsx` | Implement featured products/categories sections (see 1.3), or at minimum flip the brand-widget setting so the page has height. |
| 0.2 | **Email sender still `onboarding@resend.dev`** for forgot-password (order-notify already uses `noreply@infografstore.it`) — switch once the domain is verified on Resend. | `forgot-password/route.ts` | Domain verification (PM action) + swap `from`. |
| 0.3 | **Hermes infra: `~/.hermes/state.db` structural corruption** broke the post-CI cleanup cron jobs twice. Not part of the repo, but blocks reliable scheduled cleanup. | cron outputs | Run `hermes doctor --fix` (or salvage state.db), then re-test a cron job. |

---

## 1. MVP blockers — must ship before real go-live

These gate actual sales. Ordered by dependency.

### 1.1 Payments (transactional provider) — **the critical path**
`features.md` marks Payments 🟡 Partial: methods are configurable, but there is
**no transactional provider**. Checkout currently only records the order; no
card/wallet capture happens.

- Decision needed from PM (cost/legal): pick a provider with a $0-monthly tier
  — e.g. Stripe (pay-as-you-go) vs. a PSP with no fixed fee. This is a
  "payment provider" decision → **ask the PM** before implementing.
- Then: `POST /api/checkout` → create a payment intent/session → redirect →
  webhook to mark `order` paid → thank-you.
- Scope: single provider, EUR, one-time payments. Installments are post-MVP.

### 1.2 Order confirmation email (build it — confirmed missing, not just unverified)
`/api/checkout` creates the order and (optionally) subscribes to the
newsletter, but sends **no email at all** — verified by reading the route.
`guest-checkout.md` and `features.md` have been corrected to stop claiming
this is done. Build: an order-confirmation template (React Email), send it
from `POST /api/checkout` on success (mock Resend in CI/dev like the
forgot-password flow), and cover it with an E2E assertion.

### 1.3 Homepage content (featured products/categories)
Currently hero-only. Implement the sections already claimed in `features.md`:
featured-products carousel (query `featured=true`), featured-categories grid,
promotions strip. This also restores the page's scroll height (see 0.1) and
makes the "Torna su" button meaningful on the homepage.

### 1.4 SEO essentials
`features.md` (IG-20) lists these but they are not implemented:
- `sitemap.xml` + `robots.txt` (App Router `app/sitemap.ts`, `app/robots.ts`).
- OG/Twitter meta on product pages (already have title/description + JSON-LD).
- Static generation: catalog + product pages are currently dynamic (`ƒ` in the
  build output); consider `revalidate`/ISR for the public catalog once content
  is stable.
- `lang="it"` already set on `<html>`; verify `hreflang` is N/A (single locale).

### 1.5 Shipping methods (real carrier configuration)
`features.md` IG-12 has no status: admin carrier/zones management + user-facing
tracking are not built. MVP minimum: flat-rate vs. free-over-€150 (already in
checkout) is enough to launch; carrier integration is post-MVP. Decide whether
IG-12 stays "manual" for launch.

---

## 2. MVP completeness — features listed but not built

Each maps to an existing Linear issue (IG-7 … IG-19). Implement in this order
(revenue/relevance first):

| Priority | Feature | Linear | Notes |
|----------|---------|--------|-------|
| High | **Promotions & Newsletter** — coupon codes + admin CRUD, newsletter admin list | IG-18 | `admin/coupons` and newsletter tables already exist (`coupon`, `newsletter_subscriber`); pages are stubs. |
| High | **Reviews & Q&A** — star ratings, moderation queue, public Q&A | IG-9 | `review` + `question` tables exist; no UI. |
| Med | **Cross-selling & Wishlist** — "recommended accessories", wishlist CRUD + account page | IG-8 | `wishlist_item` table exists. |
| Med | **Admin — Warehouse/Stock** — per-variant stock, low-stock alerts, movement log | IG-16 | `stock_movement` table exists; `admin/stock` page is a stub. |
| Med | **Blog & Guides** — CRUD + markdown editor + categories/tags | IG-19 | `blog_post` table exists; `admin/blog` + `/blog` pages are stubs. |
| Low | **Users & Account** — order history, saved addresses, RMA | IG-13 | Account page exists; order history/wishlist/RMA incomplete. |
| Low | **PC Configurator** — step-by-step compatible-build flow | IG-7 | Largest UX effort; lowest launch-criticality for a reseller storefront. |

---

## 3. Post-MVP (scope.md growth path)

| Wave | Items |
|------|-------|
| **V1.1** | Abandoned-cart emails (needs a background-job mechanism), bulk product import (CSV), social logins beyond Google |
| **V1.2** | Installments (Scalapay/Klarna), multi-currency/multi-language, analytics (funnels/cohorts) |
| **V2** | Supplier portal, multi-vendor, B2B wholesale tiers |

Also explicitly deferred (from `scope.md`): native mobile app, ERP integration,
dropshipping automation, affiliate program, product comparison tool, gift cards.

---

## 4. Platform hardening (non-functional, parallelizable)

| # | Area | Detail |
|---|------|--------|
| 4.1 | **Storage upload coverage in CI** | The e2e job lacks `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; image-upload tests now use the URL-reference branch. Add the two secrets + env wiring to re-enable real storage-upload coverage. |
| 4.2 | **Upload-time image pipeline** | Manual uploads bypass sharp (only Icecat imports are downscaled→WebP). Route manual uploads through the same 1600px WebP q82 pipeline (architecture.md already flags this). |
| 4.3 | **Bucket RLS write policies** | Writes rely on the service role; RLS not configured (architecture.md flags it). Lock down public bucket to `SELECT` + service-role writes. |
| 4.4 | **UI primitive consolidation** | `@base-ui/react` (button) coexists with `@radix-ui/*` (slot, tooltip) and a `shadcn` dep. Pick one primitive source to reduce bundle + API drift. |
| 4.5 | **Animation stack** | `framer-motion`, `tw-animate-css`, and custom `@utility animate-*` in globals.css overlap. Consolidate (prefer Tailwind v4 CSS animations + the existing reveal utilities; drop framer-motion if unused). |
| 4.6 | **Lighthouse 90+** | From IG-20: image optimization (already next/image + WebP), font subsetting, bundle analysis. |
| 4.7 | **Docs index auto-sync** | `AGENTS.md` is protected and its status table is manually maintained — the drift found and fixed twice now (this session and the previous one) recurs. Consider a small script/CI check that cross-references `features.md` statuses vs. code. |
| 4.8 | **STAFF area has no real tools** | The role exists end-to-end (login, 2FA, route protection) and now lands on a real page (fixed this session), but there's nothing STAFF-specific to do there yet. Define what STAFF can access before building it — orders? stock? a subset of admin? — then build against `src/app/staff/`. |

---

## 5. Suggested sequencing

```
Phase A (this week)  — 0.x debt fixes + 1.1 payment-provider decision + 1.3 homepage sections
Phase B (MVP cut)    — 1.2 order email, 1.4 SEO, 1.5 shipping decision
Phase C (v1.0)       — Promotions/Newsletter, Reviews/Q&A, Stock dashboard
Phase D (v1.1)       — Wishlist, Cross-sell, Blog, Account completeness
Phase E (post-MVP)   — scope.md V1.1 → V2
```

**Effort/risk notes:** Payments (1.1) is the only high-risk item (external
provider, legal, webhooks). Everything in §2 is self-contained CRUD/UI on
tables that already exist in the schema, so each is a bounded, testable unit.

---

## Definition of done (per feature)

1. Unit + component + E2E tests (and aXe scans for new pages/dialogs).
2. Docs updated (`features.md` status + relevant guide).
3. `lint` (0 errors) → `test:run` → `build` → targeted E2E, all green.
4. DB left clean after E2E (`db:cleanup` + `db:cleanup-products`).
5. Commit (English message); push only on explicit PM go-ahead.
