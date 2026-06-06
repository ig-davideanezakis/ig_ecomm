import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Infograf/);
  });

  test("should display the Infograf logo in navbar", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator("header svg").first();
    await expect(logo).toBeVisible();
  });

  test("should have a theme toggle", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator('button[aria-label*="Toggle" i], button[aria-label*="chiara" i], button[aria-label*="scura" i]').first();
    await expect(toggle).toBeVisible();
  });
});

test.describe("Login page", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("Accedi")).toBeVisible();
    await expect(page.getByPlaceholder("tua@email.it")).toBeVisible();
    await expect(page.getByText("Continua con Google")).toBeVisible();
  });

  test("should show registration form for unknown email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("test@example.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await expect(page.getByText("Crea il tuo account")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate to products page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Prodotti", exact: true }).click();
    await expect(page).toHaveURL(/\/products/);
  });

  test("should navigate to admin and redirect to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
