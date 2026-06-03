# Architectural Decisions — Ig_ecomm

> **Living document** — updated as decisions evolve.
> One section per architectural area, not incremental numbered ADRs.

## Technology Stack

**Decision:** Next.js (App Router) full-stack + Supabase (PostgreSQL) + Drizzle ORM + NextAuth.js + Resend (email) + Vercel (deploy)

**Date:** 2026-05-26 (last updated: 2026-05-28)

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

---

## Database

**Decision:** Supabase (PostgreSQL) + Drizzle ORM — all snake_case naming

**Date:** 2026-05-26 (snake_case migration: 2026-05-28)

**Rationale:**
- Free tier (500MB) sufficient for MVP
- Drizzle for type safety and migrations
- Supabase Auth / Storage integration
- All table and column names use snake_case to avoid case-sensitivity issues between Drizzle ORM and Auth.js adapter

**Naming convention:** All tables (`user`, `product`, `order`, etc.) and columns (`base_price`, `created_at`, `billing_name`, etc.) are snake_case. The Auth.js adapter internal columns (`userId`, `emailVerified`, `sessionToken`) are kept PascalCase only where the adapter requires them.

---

## Authentication & Authorization

**Decision:** NextAuth.js v5 (Auth.js) with Magic Link + role-based access + selective 2FA (TOTP)

**Date:** 2026-05-28

### Role System

| Role | Level | Access | 2FA Required |
|------|-------|--------|-------------|
| GUEST | 0 | Public pages only | N/A |
| CUSTOMER | 1 | Account area, shop features | No |
| STAFF | 2 | `/staff/*` routes | Yes |
| ADMIN | 3 | `/admin/*` routes | Yes |

Roles are stored in the `user.role` column as varchar. `GUEST` is an implicit role for unauthenticated users (not stored in DB).

### Authentication Flow

1. **Magic Link** — user enters email on `/auth/login`, receives a one-time link via Resend
2. **Session Creation** — NextAuth creates a JWT session with role and 2FA status
3. **2FA Check** — if user is STAFF or ADMIN and has TOTP enabled, `needsTotp` flag is set in the JWT
4. **2FA Verification** — user is redirected to `/auth/verify-2fa`, enters 6-digit code from authenticator app
5. **Session Update** — on successful verification, `needsTotp` is cleared via NextAuth's `update()` mechanism
6. **Access Granted** — middleware allows access to protected routes

### 2FA Implementation

- **Library:** `otplib` (RFC 6238 compliant TOTP)
- **QR Code:** `qrcode` package for setup QR generation
- **Secret storage:** `totp_secret` column in `user` table (Base32-encoded)
- **Verification:** `/api/auth/verify-totp` API route with Server Action
- **Setup:** `/admin/security` page with QR code scan flow

### Route Protection

- **Middleware** (`proxy.ts`): Edge-level check for session cookie, redirects to login if missing
- **Admin layout**: Server-side `authorize("ADMIN")` call that checks role + 2FA
- **Auth helpers** (`lib/auth-helpers.ts`): Reusable `authorize()` function for any page/layout

### Authentication Methods

| Method | For | How |
|--------|-----|-----|
| **Google OAuth** | CUSTOMER | "Continua con Google" button → instant login |
| **Magic Link** | CUSTOMER | Enter email → receive link via Resend → click to login |
| **Password + 2FA** | STAFF, ADMIN | Enter email → system detects role → password form → (if 2FA enabled) TOTP code |

### Login Flow

1. User lands on `/auth/login` → sees "Continua con Google" button + email input
2. If Google OAuth: redirects to Google → callback → user created/loaded as CUSTOMER
3. If email entered: `POST /api/auth/check-email` checks the user's role:
   - **Not found or CUSTOMER** → Magic Link sent via Resend
   - **STAFF or ADMIN** → password form shown
4. After password verification (Credentials provider, bcrypt): if 2FA enabled → `needsTotp` flag set
5. 2FA verification at `/auth/verify-2fa` completes the session

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | NextAuth config: Google, Resend, Credentials providers + signIn/jwt/session callbacks |
| `src/lib/auth-helpers.ts` | `authorize()` helper for route protection |
| `src/lib/totp.ts` | TOTP secret generation, QR code, verification |
| `src/proxy.ts` | Edge middleware (session cookie check) |
| `src/app/(shop)/auth/login/` | Login page: Google button + email check + password form |
| `src/app/(shop)/auth/verify-2fa/` | 2FA verification page |
| `src/app/api/auth/check-email/` | API to detect user role by email |
| `src/app/api/auth/set-password/` | API to set/change password (bcrypt) |
| `src/app/api/auth/totp-setup/` | API to generate TOTP secret + QR code |
| `src/app/api/auth/verify-totp/` | API to verify TOTP token |
| `src/components/totp-setup.tsx` | Client component for 2FA setup UI |
| `src/components/password-setup.tsx` | Client component for password setup UI |
| `src/app/admin/security/` | Admin security settings page |
| `src/app/admin/customers/` | Admin user management (list, create, edit roles, delete) |
| `src/app/api/admin/users/` | API for user CRUD (ADMIN only) |

---

## Email

**Decision:** Resend + React Email

**Date:** 2026-05-26

**Rationale:**
- 100 emails/day free (enough for MVP)
- React Email for template development
- Simple API

**Note:** Currently using `onboarding@resend.dev` (test sender). Switch to `noreply@infografstore.it` once the domain is verified on Resend.

---

## Payments

**TBD** — criteria:
- Zero monthly fee
- Acceptable per-transaction fees
- Installment support (Klarna/Scalapay) postponed to post-MVP
