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

  test("Icecat EAN lookup shows found images as pending import preview", async ({ page }) => {
    // Intercept the Icecat lookup so the test is network-independent
    await page.route("**/api/products/lookup-ean**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          title: "ASUS ROG Strix OLED XG34WCDMS Monitor PC 34\"",
          brand: "ASUS",
          shortDesc: "Monitor QD-OLED 34 pollici",
          images: [
            { url: "https://images.icecat.biz/img/gallery/1.jpg", alt: "Foto 1" },
            { url: "https://images.icecat.biz/img/gallery/2.jpg", alt: "Foto 2" },
          ],
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-barcode").fill("4711636454414");
    await page.getByRole("button", { name: "Cerca su Icecat" }).click();

    // Title auto-filled from the lookup
    await expect(page.locator("#prod-title")).toHaveValue(/ASUS ROG Strix OLED/);
    // Preview block with the 2 found images
    await expect(page.getByText("2 immagini trovate su Icecat")).toBeVisible();
    await expect(page.getByAltText("Foto 1")).toBeVisible();
    await expect(page.getByAltText("Foto 2")).toBeVisible();
    // New product: no import button yet, only the auto-import hint
    await expect(page.getByRole("button", { name: /Importa su Storage/ })).toHaveCount(0);
    await expect(page.getByText(/verranno copiate su Storage automaticamente al salvataggio/)).toBeVisible();
  });
});
