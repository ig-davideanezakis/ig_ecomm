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

  test("Icecat EAN lookup opens selection dialog and applies only chosen sections", async ({ page }) => {
    // Intercept the Icecat lookup so the test is network-independent
    await page.route("**/api/products/lookup-ean**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          brandLogo: null,
          title: "ASUS ROG Strix OLED XG34WCDMS Monitor PC 34\"",
          brand: "ASUS",
          shortDesc: "Monitor QD-OLED 34 pollici",
          longDesc: "<p>Descrizione lunga dal catalogo Icecat</p>",
          weight: 6.8,
          images: [
            { url: "https://images.icecat.biz/img/gallery/1.jpg", alt: "Foto 1" },
            { url: "https://images.icecat.biz/img/gallery/2.jpg", alt: "Foto 2" },
          ],
          specs: [],
          bullets: [],
          bulletPoints: "",
          dimensions: { width: "", height: "", depth: "" },
          categoryHint: "",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-barcode").fill("4711636454414");
    await page.getByRole("button", { name: "Cerca su Icecat" }).click();

    // The selection dialog opens instead of auto-filling the form
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Dati trovati su Icecat")).toBeVisible();

    // Nothing is applied before confirming
    await expect(page.locator("#prod-title")).not.toHaveValue(/ASUS/);

    // Sections are listed as selectable checkboxes with previews
    await expect(dialog.getByRole("checkbox").first()).toBeVisible();
    await expect(dialog.getByText("Titolo", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Immagini", { exact: true })).toBeVisible();

    // Confirm the import of the default-selected sections
    await dialog.getByRole("button", { name: /Importa selezionate \(\d+\)/ }).click();

    // Dialog closes and the chosen data lands in the form
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("#prod-title")).toHaveValue(/ASUS ROG Strix OLED/);
    await expect(page.getByText("2 immagini trovate su Icecat")).toBeVisible();
    await expect(page.getByAltText("Foto 1")).toBeVisible();
    await expect(page.getByAltText("Foto 2")).toBeVisible();
    // New product: no import button yet, only the auto-import hint
    await expect(page.getByRole("button", { name: /Importa su Storage/ })).toHaveCount(0);
    await expect(page.getByText(/verranno copiate su Storage automaticamente al salvataggio/)).toBeVisible();
    // The long description is written into the rich text editor (sync fix)
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toContainText("Descrizione lunga dal catalogo Icecat");
  });

  test("Formatta SEO button is disabled while the editor is empty", async ({ page }) => {
    await page.goto("/admin/products/new");

    const editor = page.locator('[contenteditable="true"]').first();
    const seoBtn = page.getByRole("button", { name: "Formatta SEO" });

    // Empty editor → disabled
    await expect(seoBtn).toBeDisabled();

    // Type into the editor → enabled
    await editor.click();
    await page.keyboard.type("Descrizione di prova");
    await expect(seoBtn).toBeEnabled();

    // Clear everything → disabled again
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    await expect(seoBtn).toBeDisabled();
  });

  test("Icecat dialog cancel keeps the form untouched", async ({ page }) => {
    await page.route("**/api/products/lookup-ean**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          brandLogo: null,
          title: "ASUS ROG Strix OLED XG34WCDMS Monitor PC 34\"",
          brand: "ASUS",
          shortDesc: "Monitor QD-OLED 34 pollici",
          longDesc: "<p>Descrizione lunga dal catalogo Icecat</p>",
          weight: 6.8,
          images: [
            { url: "https://images.icecat.biz/img/gallery/1.jpg", alt: "Foto 1" },
            { url: "https://images.icecat.biz/img/gallery/2.jpg", alt: "Foto 2" },
          ],
          specs: [],
          bullets: [],
          bulletPoints: "",
          dimensions: { width: "", height: "", depth: "" },
          categoryHint: "",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-barcode").fill("4711636454414");
    await page.getByRole("button", { name: "Cerca su Icecat" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Annulla" }).click();

    // Dialog closed, nothing applied
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("#prod-title")).not.toHaveValue(/ASUS/);
    await expect(page.getByText(/immagini trovate su Icecat/)).toHaveCount(0);
  });

  test("Icecat dialog import button is disabled when all sections are unchecked", async ({ page }) => {
    await page.route("**/api/products/lookup-ean**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          brandLogo: null,
          title: "ASUS ROG Strix OLED XG34WCDMS Monitor PC 34\"",
          brand: "ASUS",
          shortDesc: "Monitor QD-OLED 34 pollici",
          longDesc: "<p>Descrizione lunga dal catalogo Icecat</p>",
          weight: 6.8,
          images: [
            { url: "https://images.icecat.biz/img/gallery/1.jpg", alt: "Foto 1" },
            { url: "https://images.icecat.biz/img/gallery/2.jpg", alt: "Foto 2" },
          ],
          specs: [],
          bullets: [],
          bulletPoints: "",
          dimensions: { width: "", height: "", depth: "" },
          categoryHint: "",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-barcode").fill("4711636454414");
    await page.getByRole("button", { name: "Cerca su Icecat" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Uncheck every section
    const checkboxes = dialog.getByRole("checkbox");
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).uncheck();
    }

    await expect(dialog.getByRole("button", { name: /Importa selezionate \(0\)/ })).toBeDisabled();
  });
});
