# Testing Guidelines

> Testing strategy and best practices for ig_ecomm.
> Last updated: 2026-05-26

## Stack

| Tool | Scope | Purpose |
|------|-------|---------|
| **Vitest** | Unit & Component Tests | Fast test runner with native ESM + TypeScript support |
| **@testing-library/react** | Component Tests | Render React components, query the DOM as users do |
| **@testing-library/jest-dom** | DOM Matchers | Custom matchers: `toBeInTheDocument()`, `toHaveClass()`, etc. |
| **@testing-library/user-event** | User Interaction | Realistic event simulation (clicks, typing) |
| **Playwright** | E2E Tests | Multi-browser end-to-end testing on a real Next.js server |

## Scripts

| Command | What it does |
|---------|-------------|
| `npm test` | Run Vitest in watch mode (great during development) |
| `npm run test:run` | Run all Vitest tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run all Playwright E2E tests |
| `npm run test:e2e:ui` | Launch Playwright UI mode |

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
├── smoke.spec.ts           # Core smoke tests (always pass)
├── auth.spec.ts            # Auth flow tests
└── catalog.spec.ts         # Catalog browsing tests
```

## Guidelines

### General Principles

1. **Test behavior, not implementation** — don't test internal state or private functions. Test what the user sees and does.
2. **Write tests first (TDD)** for complex business logic and utility functions.
3. **Keep tests simple** — one `it()` per behavior. If a test has multiple expectations, split it.
4. **Avoid mocking too much** — mock only what crosses boundaries (API, DB, auth). Prefer real components.

### Component Tests (@testing-library/react)

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders the title", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Utility Tests

```tsx
import { describe, it, expect } from "vitest";
import { formatPrice } from "./utils";

describe("formatPrice", () => {
  it("formats integer as EUR", () => {
    expect(formatPrice(10)).toBe("€10,00");
  });
});
```

### Server Component Tests

Server Components can't be rendered with `render()` from testing-library. Test them in two ways:
- **For complex logic**: extract the data-fetching and rendering logic into separate utility functions, test those
- **For simple pass-through**: rely on E2E tests with Playwright instead

### E2E Tests (Playwright)

```ts
import { test, expect } from "@playwright/test";

test("user can browse products", async ({ page }) => {
  await page.goto("/products");
  await expect(page.locator("[data-testid=product-card]").first()).toBeVisible();
});
```

**Rules:**
- Keep E2E tests focused on **critical user journeys** (browse → add to cart → checkout)
- Use `data-testid` attributes sparingly — prefer accessible selectors (text, role, label)
- Run E2E tests locally with `npm run test:e2e` before pushing

## When to Write What

| Scenario | Test Type | Example |
|----------|-----------|---------|
| Utility function | **Unit** (Vitest) | Price formatting, slug generation |
| Client component interaction | **Component** (Testing Library) | Toggle button, cart quantity update |
| Form validation | **Component** | Login form, checkout form |
| Server Component rendering | **E2E** (Playwright) | Product page, catalog listing |
| API route | **Integration** (Vitest + MSW) | Order creation, product search |
| Critical user flow | **E2E** (Playwright) | Complete purchase flow |

## MSW (Future)

For API route testing, we'll add [MSW](https://mswjs.io/) when API routes are ready. It intercepts network requests at the service worker level, so our tests don't need a real server.

## Coverage Targets (MVP)

| Area | Target | Notes |
|------|--------|-------|
| Utility functions | 90%+ | Pure logic, easy to cover |
| Storefront components | 70%+ | Focus on interactive ones (cart, search) |
| Admin components | 50%+ | Forms, CRUD operations |
| E2E critical paths | All major flows | Homepage, browse, product, checkout |

---

*This document should be updated when new testing tools or patterns are adopted.*
