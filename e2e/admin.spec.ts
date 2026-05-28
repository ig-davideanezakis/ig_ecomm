import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should redirect all admin routes to login when not authenticated", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should redirect to login with callback URL", async ({ page }) => {
    await page.goto("/admin/dashboard");
    // The callbackUrl should preserve the original destination
    const url = new URL(page.url());
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("callbackUrl")).toBe("/admin/dashboard");
  });

  test("should redirect admin blog route to login", async ({ page }) => {
    await page.goto("/admin/blog");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should redirect admin orders route to login", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("login page has admin link reference", async ({ page }) => {
    // Auth page should still render its content even if linking to admin
    await page.goto("/auth/login");
    await expect(page.getByText("Accedi")).toBeVisible();
  });
});
