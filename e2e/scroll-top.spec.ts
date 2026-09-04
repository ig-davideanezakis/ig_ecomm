import { test, expect } from "@playwright/test";

/**
 * Scroll-to-top "Torna su" arrow — must work on every page of the app (front
 * shop and admin back):
 * - hidden at the top of the page (aria-hidden, not in the accessibility tree);
 * - appears only after scrolling beyond 300px, with a 200ms CSS fade;
 * - clicking (or activating with the keyboard) scrolls the page/container back
 *   to the top with a smooth behavior.
 */
test.describe("Scroll-to-top — front and back", () => {
  test("shop: /products shows the arrow after scrolling, fades out and scrolls back", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const topBtn = page.getByRole("button", { name: "Torna su" });
    await expect(topBtn).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(topBtn).toBeVisible();
    // 200ms fade transition per spec
    await expect(topBtn).toHaveCSS("transition-duration", "0.2s");

    await topBtn.click();
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThan(10);
    // Fade-out: back at the top the button is gone from the a11y tree,
    // invisible (opacity 0), inert and no longer focusable.
    await expect(topBtn).toHaveCount(0);
    const btn = page.locator('button[aria-label="Torna su"]');
    await expect(btn).toHaveAttribute("aria-hidden", "true");
    await expect(btn).toHaveCSS("opacity", "0");
    await expect(btn).toHaveCSS("pointer-events", "none");
    await expect(btn).toHaveAttribute("tabindex", "-1");
  });

  test("shop: the arrow is reachable and activatable with the keyboard", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const topBtn = page.getByRole("button", { name: "Torna su" });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(topBtn).toBeVisible();

    await topBtn.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThan(10);

    // Space activates it too
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(topBtn).toBeVisible();
    await topBtn.focus();
    await page.keyboard.press("Space");
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThan(10);
  });

  test("admin: product form shows the arrow after scrolling and scrolls back", async ({ page }) => {
    // Login as admin
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto("/admin/products/new");
    await page.waitForLoadState("networkidle");

    const topBtn = page.getByRole("button", { name: "Torna su" });
    await expect(topBtn).toHaveCount(0);

    await page.evaluate(() => {
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 1200;
      window.scrollTo(0, 1200);
    });
    await expect(topBtn).toBeVisible();

    await topBtn.click();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const mainEl = document.querySelector("main");
          return Math.max(window.scrollY, mainEl ? mainEl.scrollTop : 0);
        }),
      )
      .toBeLessThan(10);
  });
});
