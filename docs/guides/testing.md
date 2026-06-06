# Testing Guidelines

> Testing strategy and best practices for ig_ecomm.
> Last updated: 2026-06-06

## Stack

| Tool | Scope | Purpose |
|------|-------|---------|
| **Vitest** | Unit & Component Tests | Fast test runner with native ESM + TypeScript support |
| **@testing-library/react** | Component Tests | Render React components, query the DOM as users do |
| **@testing-library/jest-dom** | DOM Matchers | Custom matchers: `toBeInTheDocument()`, `toHaveClass()`, etc. |
| **@testing-library/user-event** | User Interaction | Realistic event simulation (clicks, typing) |
| **Playwright** | E2E Tests | Multi-browser end-to-end testing on a real Next.js server |
| **@axe-core/playwright** | Accessibility (E2E) | Automated WCAG compliance scanning in Playwright tests |

## Scripts

| Command | What it does |
|---------|-------------|
| `npm test` | Run Vitest in watch mode (great during development) |
| `npm run test:run` | Run all Vitest tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run all Playwright E2E tests (auth, smoke, theme, admin) |
| `npm run test:e2e:ui` | Launch Playwright UI mode |
| `npm run db:seed-test-users` | Seed test users for E2E (admin, staff, customer) |
| `npm run db:cleanup` | Delete test users created during E2E runs |

## Project Structure

```
src/
├── components/
│   ├── __tests__/          # Component unit tests (.test.tsx)
│   └── ui/                 # shadcn UI components
├── lib/
│   ├── __tests__/          # Utility function tests (.test.ts)
│   └── ...
├── app/
│   └── (shop)/
│       └── __tests__/      # Page-level component tests
e2e/
├── auth.spec.ts            # Auth flows (login, register, forgot-password, logout, API)
├── smoke.spec.ts           # Core smoke tests (homepage, login, navigation)
├── theme.spec.ts           # Theme toggle, persistence, script injection
├── admin.spec.ts           # Admin redirect/access tests
├── accessibility.spec.ts   # aXe-core WCAG scans (homepage, login, products)
└── catalog.spec.ts         # Catalog browsing tests
```

## Guidelines

### General Principles

1. **Test behavior, not implementation** — don't test internal state or private functions. Test what the user sees and does.
2. **Write tests first (TDD)** for complex business logic and utility functions.
3. **Keep tests simple** — one `it()` per behavior. If a test has multiple expectations, split it.
4. **Avoid mocking too much** — mock only what crosses boundaries (API, DB, auth). Prefer real components.

### E2E Tests (Playwright)

```ts
import { test, expect } from "@playwright/test";

test("user can browse products", async ({ page }) => {
  await page.goto("/products");
  await expect(page.locator("[data-testid=product-card]").first()).toBeVisible();
});
```

**Rules:**
- Keep E2E tests focused on **critical user journeys** (auth, browse → add to cart → checkout)
- Use `data-testid` attributes sparingly — prefer accessible selectors (text, role, label)
- Run E2E tests locally with `npm run test:e2e` before pushing
- **Prerequisite:** run `npm run db:seed-test-users` first (creates admin, staff, customer accounts)
- **Cleanup:** test users are automatically cleaned up in CI via `scripts/cleanup-test-users.ts`
- **CI guard:** If E2E tests fail in CI, the deploy job is blocked — all jobs must pass

### E2E test flow — authentication

The E2E tests test the following auth flows:

1. **Email entry** — user enters email, check-email API routes to correct form
2. **Existing user with password** → "Bentornato!" + password form → "Password dimenticata?"
3. **New user** → registration form (email + password in one step) → auto-login
4. **Forgot password** → click link → API generates token → dev link extracted → navigate to reset page → new password → auto-login
5. **Google OAuth** — button visible on login page (click not tested in E2E)
6. **Wrong password** → error "Email o password non validi."
7. **Logout** → redirect to login → admin access blocked

### Accessibility Tests (aXe-core)

Automated scans with [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright):

```ts
test("login page should have no violations", async ({ page }) => {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**Test targets:**
| Page | Target |
|------|--------|
| Homepage | 0 critical violations |
| Login | 0 violations (all) |
| Products catalog | 0 critical violations |

### Test Users (for E2E)

| Email | Password | Role |
|-------|----------|------|
| `admin@test.com` | `TestPass123!` | ADMIN |
| `staff@test.com` | `TestPass123!` | STAFF |
| `customer@test.com` | `TestPass123!` | CUSTOMER |

```bash
npm run db:seed-test-users    # Creates the 3 test users above
npm run db:cleanup            # Deletes test users created during E2E runs
```

E2E tests create temporary users with the prefix `e2e-*`. The cleanup script deletes:
- All users matching the `e2e-*` pattern
- The 3 seed test users (`admin@test.com`, `staff@test.com`, `customer@test.com`)
- Their linked accounts, sessions, and verification tokens

## CI Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs:

```
lint → test (Vitest) → build → e2e (Playwright) → cleanup test users → a11y (aXe) → deploy
```

All test jobs must pass before deployment to Vercel. After E2E tests, the cleanup step always runs (even if tests fail) to remove temporary test users.

## Coverage Targets (MVP)

| Area | Target | Notes |
|------|--------|-------|
| Utility functions | 90%+ | Pure logic, easy to cover |
| Storefront components | 70%+ | Focus on interactive ones (cart, search) |
| Admin components | 50%+ | Forms, CRUD operations |
| E2E critical paths | All major flows | Homepage, browse, product, auth |
| aXe a11y scans | 0 critical violations | Homepage, login, products |

---

*This document should be updated when new testing tools or patterns are adopted.*
