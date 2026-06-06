import { test, expect } from "@playwright/test";

test.describe("Admin Products — unauthenticated", () => {
  test("should redirect to login", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Admin Products — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("should display product list page", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Prodotti" })).toBeVisible();
  });

  test("should display create product form with all sections", async ({ page }) => {
    await page.goto("/admin/products/new");
    await expect(page.getByRole("heading", { name: "Nuovo prodotto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Informazioni di base" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prezzi" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Immagini" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Varianti" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stato" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Organizzazione" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SEO" })).toBeVisible();
    await expect(page.locator("#prod-title")).toBeVisible();
    await expect(page.locator("#prod-price")).toBeVisible();
  });
});
