# Ig_ecomm — Quick Start

**Computer store e-commerce** — Infograf Store

- **Repo:** `git@github.com:ig-davideanezakis/ig_ecomm.git`
- **Stack:** Next.js 16 + Supabase + Drizzle ORM + NextAuth + Tailwind CSS + Framer Motion
- **Deploy:** Vercel ($0/mo MVP) — CI enforces lint → test → build → E2E → deploy
- **Tracking:** [Linear Project](https://linear.app/ig-ecomm/project/ig-ecomm-a56b8c556371) (team: IG)

## Docs Index

| File | What you'll find |
|------|------------------|
| [docs/decisions/architecture.md](docs/decisions/architecture.md) | Stack choices, rationale, trade-offs |
| [docs/guides/behaviour.md](docs/guides/behaviour.md) | Team roles, communication rules, AI/PM workflow, operating model, **pre-push checklist** → START HERE |
| [docs/guides/organization.md](docs/guides/organization.md) | Project structure, coding conventions, DB schema summary |
| [docs/guides/brand.md](docs/guides/brand.md) | Brand identity, colors, fonts, design decisions |
| [docs/guides/features.md](docs/guides/features.md) | MVP feature list with Linear references |
| [docs/guides/scope.md](docs/guides/scope.md) | MVP boundaries, what's postponed |
| [docs/guides/testing.md](docs/guides/testing.md) | Testing stack, guidelines, best practices |
| [docs/guides/accessibility.md](docs/guides/accessibility.md) | EAA compliance, WCAG, aria, focus, aXe testing |
| [db/schema/index.ts](src/db/schema/index.ts) | Full database schema (Drizzle ORM) |

## ⚠️ CRITICAL: Pre-push Checklist

Before every `git push`, run these 3 commands **in order** and verify all pass:

```bash
npm run lint        # Zero errors
npm run test:run    # All tests passing
npm run build       # Clean build
```

Only push when all three pass. Never skip this — GitHub Actions will fail and the PM will notice.

## Status

| Feature | Status | Notes |
|---------|--------|-------|
| Project Scaffolding | ✅ Done | IG-21 |
| CI/CD & Vercel Deploy | ✅ Done | IG-22 — pipeline: lint → test → build → E2E → deploy |
| Authentication — Magic Link | ✅ Done | IG-23 — Resend email provider |
| Authentication — Google OAuth | ✅ Done | For CUSTOMER role only |
| Authentication — Password + 2FA | ✅ Done | For STAFF/ADMIN roles (TOTP via otplib) |
| Theme System & Brand Identity | ✅ Done | IG-24 |
| Catalog (DB schema + queries) | ✅ Done | IG-6 |
| Admin — Dashboard & Reports | ✅ Done | IG-14 |
| Admin — User Management | ✅ Done | List, create, edit roles, delete |
| DB Schema — snake_case | ✅ Done | All tables & columns |
| E2E Tests | ✅ Done | 45 Playwright tests (auth, smoke, theme, admin, aXe) |
| EAA Compliance | ✅ Done | [docs/guides/accessibility.md](docs/guides/accessibility.md) — jsx-a11y linting, SkipNav, <Image/>, semantic grids, form labels, focus-visible, aria-label, aXe CI |

## Quick Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
npm run test:run         # Vitest (unit + component)
npm run test:e2e         # Playwright E2E (requires running DB)
npm run db:check         # Test DB connection
npm run db:migrate       # Apply snake_case migration
npm run db:init          # Full DB init (tables + seed)
npm run db:seed-test-users  # Seed E2E test users
npm run db:seed-admin    # Create/promote admin user
npm run db:promote-admin # Promote user to ADMIN role
```

## Required Environment Variables

| Variable | Where | Required |
|----------|-------|----------|
| `DATABASE_URL` | .env + GitHub Secrets + Vercel | ✅ |
| `AUTH_SECRET` | .env + GitHub Secrets + Vercel | ✅ |
| `AUTH_RESEND_KEY` | .env + Vercel | ✅ for magic links |
| `AUTH_GOOGLE_ID` | .env + Vercel | ✅ for Google OAuth |
| `AUTH_GOOGLE_SECRET` | .env + Vercel | ✅ for Google OAuth |
| `VERCEL_DEPLOY_HOOK` | GitHub Secrets | ✅ for deploy |
| `VERCEL_TOKEN` | GitHub Secrets | ✅ for deploy monitoring |
| `VERCEL_PROJECT_ID` | GitHub Secrets | ✅ for deploy monitoring |

## ⚠️ Known Pitfalls

- **Missing `@types/*` packages** cause Vercel build to fail. When adding a new npm dependency that's imported in TypeScript files, check if it needs a corresponding `@types/` package. Example: `pg` needs `@types/pg`.
- **Middleware file** (`middleware.ts`) is deprecated in Next.js 16 in favor of `proxy.ts`.
- **Pre-push checklist** is the single most important rule — never skip it.
- **E2E tests require a running DB** — run `npm run db:seed-test-users` before `npm run test:e2e`.
