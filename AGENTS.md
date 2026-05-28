# Ig_ecomm — Quick Start

**Computer store e-commerce** — Infograf Store

- **Repo:** `git@github.com:ig-davideanezakis/ig_ecomm.git`
- **Stack:** Next.js 16 + Supabase + Drizzle ORM + NextAuth + Tailwind CSS + Framer Motion
- **Deploy:** Vercel ($0/mo MVP)
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
| [db/schema/index.ts](src/db/schema/index.ts) | Full database schema (Drizzle ORM) |

## Quick Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test:run     # Vitest
npm run test:e2e     # Playwright E2E
npm run db:push      # Push schema to DB (Drizzle Kit)
npm run db:generate  # Generate migrations
npm run db:seed      # Seed test data
```
