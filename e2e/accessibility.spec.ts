import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility scans that need NO authentication — run by the standalone
 * `a11y` CI job, which does not seed test users.
 *
 * Authenticated aXe scans (product detail page, admin Icecat dialog) live in
 * e2e/admin-a11y.spec.ts and run inside the `e2e` job, where test users are
 * seeded before the run.
 */
test.describe("Accessibility — public pages (no auth)", () => {
  test("homepage should have no critical violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("login page should have no violations", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("products catalog page should have no critical violations", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
