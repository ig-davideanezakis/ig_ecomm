import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility — axe-core scans", () => {
  test("homepage should have no critical violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalSerious = results.violations.filter(
      (v) => v.impact === "critical",
    );

    expect(criticalSerious).toEqual([]);
  });

  test("login page should have no violations", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("products catalog page should have no critical violations", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("product detail page should have no critical violations", async ({ page }) => {
    // Authenticate to create a published product with content/specs
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

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

    await page.goto(`/product/${slug}`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("admin Icecat selection dialog should have no violations", async ({ page }) => {
    // Authenticate as admin
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Intercept the Icecat lookup so the scan is network-independent
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
    await page.getByRole("button", { name: "Cerca su Icecat" }).click();

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
