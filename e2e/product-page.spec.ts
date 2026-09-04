import { test, expect } from "@playwright/test";

const SLUG = `prodotto-e2e-pdp-${Date.now().toString(36)}`;

test.describe("Product page (PDP) — authenticated setup", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin so we can create a published product with stock
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("renders JSON-LD, availability traffic light and trust bar", async ({ page }) => {
    // Create a published product with a stocked variant
    const res = await page.request.post("/api/admin/products", {
      data: {
        title: "Monitor E2E PDP",
        slug: SLUG,
        barcode: "4711636454414",
        description: "Monitor da test per la product page",
        basePrice: 299,
        published: true,
      },
    });
    const created = await res.json();
    expect(created.success).toBe(true);

    // The create API appends a random suffix to the slug → use the returned one
    await page.goto(`/product/${created.slug}`);

    // JSON-LD Product schema
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const parsed = JSON.parse((await jsonLd.textContent()) || "{}");
    expect(parsed["@type"]).toBe("Product");
    expect(parsed.name).toContain("Monitor E2E PDP");
    expect(parsed.offers).toBeDefined();
    expect(String(JSON.stringify(parsed.offers))).toContain("InStock");

    // Availability traffic light
    await expect(page.getByText("Pronto per la spedizione")).toBeVisible();

    // Trust bar: local assistance with phone + pickup in store
    await expect(page.getByText("Assistenza locale")).toBeVisible();
    await expect(page.getByRole("link", { name: /091 342171/ })).toHaveAttribute("href", "tel:+39091342171");
    await expect(page.getByText("Ritiro in sede")).toBeVisible();
    await expect(page.getByText("Garanzia 24 mesi")).toBeVisible();
  });

  test("shows the sticky buy bar on mobile with price and CTA", async ({ page }) => {
    const res = await page.request.post("/api/admin/products", {
      data: {
        title: "Monitor E2E Sticky",
        slug: `${SLUG}-sticky`,
        barcode: "843591075589",
        description: "Prodotto per testare la sticky bar mobile",
        basePrice: 149,
        published: true,
      },
    });
    const created = await res.json();
    expect(created.success).toBe(true);

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/product/${created.slug}`);

    // Sticky bar is visible on mobile with price and CTA
    const buyBar = page.locator(".fixed.inset-x-0.bottom-0");
    await expect(buyBar).toBeVisible();
    await expect(buyBar.getByText(/149,00/)).toBeVisible();
    await expect(buyBar.getByRole("button", { name: "Aggiungi al carrello" })).toBeVisible();

    // The in-content CTA exists too
    await expect(page.getByRole("button", { name: "Aggiungi al carrello" }).first()).toBeVisible();

    // On desktop the sticky bar is hidden
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(buyBar).toBeHidden();
  });
});
