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
    await expect(page.getByRole("heading", { name: "Organizzazione" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SEO" })).toBeVisible();
    await expect(page.locator("#prod-title")).toBeVisible();
    await expect(page.locator("#prod-price")).toBeVisible();
    // Stato lives inline in the header (no dedicated section)
    await expect(page.getByLabel("Pubblicato")).toBeVisible();
    await expect(page.getByLabel("In evidenza")).toBeVisible();
    // Back to search breadcrumb + scroll-to-top appear on the page
    await expect(page.getByRole("button", { name: "Torna alla ricerca" })).toBeVisible();

    // Scroll-to-top arrow appears only after scrolling down
    await expect(page.getByRole("button", { name: "Torna in alto" })).toHaveCount(0);
    await page.evaluate(() => {
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 900;
      window.scrollTo(0, 900);
    });
    const topBtn = page.getByRole("button", { name: "Torna in alto" });
    await expect(topBtn).toBeVisible();
    await topBtn.click();
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
          specs: [
            { label: "Risoluzione", value: "3440x1440" },
            { label: "Rapporto", value: "21:9" },
          ],
          specGroups: [
            {
              group: "Display",
              rows: [
                { label: "Risoluzione", value: "3440x1440" },
                { label: "Rapporto", value: "21:9" },
              ],
            },
          ],
          bullets: [],
          bulletPoints: "",
          dimensions: { width: "", height: "", depth: "" },
          categoryHint: "",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-gtin").fill("4711636454414");
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
    // The technical specifications land in their dedicated field (grouped JSON)
    await expect(page.locator("#prod-specs")).toHaveValue(/Risoluzione/);
    await expect(page.locator("#prod-specs")).toHaveValue(/3440x1440/);
    // And the live preview renders the grouped table with the group heading
    await expect(page.getByText("Anteprima", { exact: true })).toBeVisible();
    await expect(page.getByText("Display", { exact: true })).toBeVisible();
    await expect(page.getByText("3440x1440", { exact: true })).toBeVisible();
  });

  test("central 'Formatta SEO con AI' button requires a title", async ({ page }) => {
    await page.goto("/admin/products/new");

    const seoBtn = page.getByRole("button", { name: "Formatta SEO con AI" });
    await expect(seoBtn).toBeVisible();

    // No title → disabled
    await expect(seoBtn).toBeDisabled();

    // Title present → enabled (formats the description + generates meta)
    await page.locator("#prod-title").fill("Monitor ASUS 27");
    await expect(seoBtn).toBeEnabled();
  });

  test("edit page shows 'Vedi nel negozio' link opening the shop product in a new tab", async ({ page }) => {
    // Create a product via the authenticated request context (reuses the
    // session cookie from beforeEach) so the edit page has a slug to link.
    const createRes = await page.request.post("/api/admin/products", {
      data: {
        title: "Prodotto E2E Vista",
        slug: "prodotto-e2e-vista",
        barcode: "843591058094",
        basePrice: 10,
        published: true,
      },
    });
    const created = await createRes.json();
    expect(created.success).toBe(true);

    await page.goto(`/admin/products/${created.id}`);

    const viewLink = page.getByRole("link", { name: /Vedi nel negozio/ });
    await expect(viewLink).toBeVisible();
    // The create API appends a random suffix to the slug, so match by prefix
    await expect(viewLink).toHaveAttribute("href", /\/product\/prodotto-e2e-vista/);
    await expect(viewLink).toHaveAttribute("target", "_blank");
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
          specs: [
            { label: "Risoluzione", value: "3440x1440" },
            { label: "Rapporto", value: "21:9" },
          ],
          specGroups: [
            {
              group: "Display",
              rows: [
                { label: "Risoluzione", value: "3440x1440" },
                { label: "Rapporto", value: "21:9" },
              ],
            },
          ],
          bullets: [],
          bulletPoints: "",
          dimensions: { width: "", height: "", depth: "" },
          categoryHint: "",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-gtin").fill("4711636454414");
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
          specs: [
            { label: "Risoluzione", value: "3440x1440" },
            { label: "Rapporto", value: "21:9" },
          ],
          specGroups: [
            {
              group: "Display",
              rows: [
                { label: "Risoluzione", value: "3440x1440" },
                { label: "Rapporto", value: "21:9" },
              ],
            },
          ],
          bullets: [],
          bulletPoints: "",
          dimensions: { width: "", height: "", depth: "" },
          categoryHint: "",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-gtin").fill("4711636454414");
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
