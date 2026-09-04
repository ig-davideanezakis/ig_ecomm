import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Authenticated accessibility scans (admin login + product creation).
 *
 * These run inside the `e2e` CI job (they are picked up by testDir ./e2e),
 * where scripts/seed-test-users.ts runs BEFORE the tests and the users are
 * only cleaned up after the whole job. The standalone `a11y` CI job keeps
 * only the public scans (e2e/accessibility.spec.ts) precisely because it
 * does not seed test users.
 */
test.describe("Accessibility — authenticated pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("product detail page should have no critical violations", async ({ page }) => {
    // Create a published product with content + grouped specs
    const slug = `prodotto-e2e-a11y-${Date.now().toString(36)}`;
    const res = await page.request.post("/api/admin/products", {
      data: {
        title: "Prodotto E2E Accessibilità",
        slug,
        barcode: "0761345117586",
        description: "Prodotto per lo scan di accessibilità",
        content: "<p>Descrizione dettagliata del prodotto di test.</p>",
        specifications: JSON.stringify([
          { group: "Display", rows: [{ label: "Risoluzione", value: "3440x1440" }] },
        ]),
        basePrice: 199,
        published: true,
      },
    });
    const created = await res.json();
    expect(created.success).toBe(true);

    // The create API appends a random suffix to the slug → use the returned one
    await page.goto(`/product/${created.slug}`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("product image lightbox should have no violations", async ({ page }) => {
    // Create a published product with two images so the gallery lightbox opens
    const res = await page.request.post("/api/admin/products", {
      data: {
        title: "Prodotto E2E Lightbox",
        slug: `prodotto-e2e-lightbox-${Date.now().toString(36)}`,
        barcode: "7627780914583",
        description: "Prodotto per lo scan aXe del lightbox immagini",
        basePrice: 129,
        published: true,
      },
    });
    const created = await res.json();
    expect(created.success).toBe(true);

    // Attach two image records via the URL-reference branch of /api/admin/upload
    // (CI has no Supabase storage credentials — only DATABASE_URL — so the
    // multipart/storage path cannot run there; images.icecat.biz is whitelisted
    // in next.config for next/image).
    const icecatBase = "https://images.icecat.biz/img/gallery/e2e-lightbox";
    for (const [i, alt] of ["Foto E2E 1", "Foto E2E 2"].entries()) {
      const up = await page.request.post("/api/admin/upload", {
        data: {
          productId: String(created.id),
          alt,
          url: `${icecatBase}-${i + 1}.jpg`,
        },
      });
      expect((await up.json()).success).toBe(true);
    }

    await page.goto(`/product/${created.slug}`);
    await page.waitForLoadState("networkidle");

    // Open the lightbox and scan ONLY the dialog content
    await page.getByRole("button", { name: "Ingrandisci immagine" }).click();
    const dlg = page.getByRole("dialog", { name: /Anteprima immagini/ });
    await expect(dlg).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"][aria-label*="Anteprima immagini"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
  });

  test("admin Icecat selection dialog should have no violations", async ({ page }) => {
    // Intercept the Icecat lookup so the scan is network-independent
    await page.route("**/api/products/lookup-ean**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          brandLogo: null,
          title: 'ASUS ROG Strix OLED XG34WCDMS Monitor PC 34"',
          brand: "ASUS",
          shortDesc: "Monitor QD-OLED 34 pollici",
          longDesc: "<p>Descrizione lunga dal catalogo Icecat</p>",
          weight: 6.8,
          images: [
            { url: "https://images.icecat.biz/img/gallery/1.jpg", alt: "Foto 1" },
            { url: "https://images.icecat.biz/img/gallery/2.jpg", alt: "Foto 2" },
          ],
          specs: [{ name: "Risoluzione", value: "3440x1440" }],
          bullets: ["HDR True Black 400", "180 Hz"],
          bulletPoints: "HDR True Black 400\n180 Hz",
          dimensions: { width: "81.3", height: "36.2", depth: "11.5" },
          categoryHint: "Monitor",
        }),
      });
    });

    await page.goto("/admin/products/new");
    await page.locator("#prod-gtin").fill("4711636454414");
    await page.getByRole("button", { name: "Importa dati da Icecat" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Scan only the dialog itself — the rest of the admin page has
    // pre-existing contrast issues unrelated to this feature
    const results = await new AxeBuilder({ page })
      .include("[role='dialog']")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
