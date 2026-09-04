import { test, expect } from "@playwright/test";

/**
 * Scroll-to-top arrow: must work on every page of the app (front shop and
 * admin back). Hidden at the top of the page, appears after scrolling down,
 * and clicking it brings the page back to the top.
 */
test.describe("Scroll-to-top — front and back", () => {
  test("shop: /products shows the arrow after scrolling and scrolls back", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const topBtn = page.getByRole("button", { name: "Torna in alto" });
    await expect(topBtn).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(topBtn).toBeVisible();

    await topBtn.click();
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

    const topBtn = page.getByRole("button", { name: "Torna in alto" });
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
