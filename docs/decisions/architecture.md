# Architectural Decisions — Ig_ecomm

> **Living document** — updated as decisions evolve.
> One section per architectural area, not incremental numbered ADRs.

## Technology Stack

**Decision:** Next.js (App Router) full-stack + Supabase (PostgreSQL) + Prisma + NextAuth.js + Resend (email) + Vercel (deploy)

**Date:** 2026-05-26

**Rationale:**
- Single deploy (Vercel), no separate backend to maintain
- Native SSG/SSR for perfect SEO
- Custom admin panel inside Next.js (`/admin/*` routes) — zero external SaaS
- Supabase is standard PostgreSQL — no vendor lock
- MVP cost = $0/month

**Discarded options:**
- Strapi (separate server costs + maintenance overhead)
- Django/Wagtail (unfamiliar stack for the team)
- Sanity CMS (paid plans at scale)

**Consequences:**
- Admin panel needs custom development (more initial work, full control)
- Images: Supabase Storage (free 1GB) -> Cloudflare Images when needed
- Search: PostgreSQL ILIKE for MVP -> Meilisearch/Typesense later
- Payments: TBD (no provider chosen yet)

---

## Frontend

**Decision:** Next.js App Router + TypeScript + Tailwind CSS + Framer Motion

**Date:** 2026-05-26

**Rationale:**
- RSC (React Server Components) for performant product pages
- Tailwind for rapid development, consistent theming
- Framer Motion for scroll animations (parallax, reveal) without heavy JS

**TBD:**
- UI component library (shadcn/ui? Radix?)

---

## Database

**Decision:** Supabase (PostgreSQL) + Prisma ORM

**Date:** 2026-05-26

**Rationale:**
- Free tier (500MB) sufficient for MVP
- Prisma for type safety and migrations
- Supabase Auth / Storage integration
- Future migration: RDS/Aurora PostgreSQL direct

---

## Authentication

**Decision:** NextAuth.js (Auth.js)

**Date:** 2026-05-26

**Rationale:**
- Native Next.js integration
- Magic link support (passwordless), Google OAuth, email
- Free, self-hosted

---

## Email

**Decision:** Resend + React Email

**Date:** 2026-05-26

**Rationale:**
- 100 emails/day free (enough for MVP)
- React Email for template development
- Simple API

---

## Payments

**TBD** — criteria:
- Zero monthly fee
- Acceptable per-transaction fees
- Installment support (Klarna/Scalapay) postponed to post-MVP

---
*Next area to define: database schema*
