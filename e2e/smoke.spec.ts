import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Infograf/);
  });

  test("should display the Infograf logo in navbar", async ({ page }) => {
    await page.goto("/");
    // The logo is an SVG inside a link — check the SVG element exists
    const logo = page.locator("header nav a svg, header a svg").first();
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

  test("should submit the email form for unknown email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("test@example.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    // The app always shows "Link inviato!" for security (prevents email enumeration)
    await expect(page.getByText("Link inviato!")).toBeVisible({ timeout: 10000 });
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
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
