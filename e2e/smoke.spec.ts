import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Infograf/);
  });

  test("should display the Infograf logo in navbar", async ({ page }) => {
    await page.goto("/");
    const logo = page.getByRole("link", { name: "Infograf" }).locator("img");
    await expect(logo).toBeVisible();
  });

  test("should have a theme toggle", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("[aria-label]").first();
    await expect(toggle).toBeVisible();
  });
});

test.describe("Login page", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("Accedi")).toBeVisible();
    await expect(page.getByPlaceholder("tua@email.it")).toBeVisible();
  });

  test("should submit the email form", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("test@example.com");
    await page.getByRole("button", { name: /Invia link magico/i }).click();
    // After submission the "Link inviato!" message should appear
    await expect(page.getByText("Link inviato!")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate to products page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Prodotti", exact: true }).click();
    await expect(page).toHaveURL(/\/products/);
  });

  test("should navigate to blog page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Blog" }).click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test("should navigate to admin and redirect to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
