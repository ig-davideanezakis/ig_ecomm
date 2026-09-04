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

  test("gallery: no horizontal overflow on mobile + click-to-zoom lightbox (buttons, keyboard, swipe)", async ({ page }) => {
    const res = await page.request.post("/api/admin/products", {
      data: {
        title: "Monitor E2E Gallery",
        slug: `monitor-e2e-gallery-${Date.now().toString(36)}`,
        barcode: "7627780914582",
        description: "Prodotto per testare la galleria immagini con lightbox",
        basePrice: 249,
        published: true,
      },
    });
    const created = await res.json();
    expect(created.success).toBe(true);

    // Attach two tiny PNG images (multipart → Supabase Storage)
    const redPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const bluePng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    for (const [b64, alt] of [
      [redPng, "Fronte E2E"],
      [bluePng, "Retro E2E"],
    ] as const) {
      const up = await page.request.post("/api/admin/upload", {
        multipart: {
          productId: String(created.id),
          alt,
          file: { name: `${alt}.png`, mimeType: "image/png", buffer: Buffer.from(b64, "base64") },
        },
      });
      expect((await up.json()).success).toBe(true);
    }

    // Mobile: the page must NOT overflow horizontally (gallery regression)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/product/${created.slug}`);
    await page.waitForLoadState("networkidle");
    const noOverflow = await page.evaluate(
      () => document.scrollingElement!.scrollWidth <= window.innerWidth + 1,
    );
    expect(noOverflow).toBe(true);

    // Thumbnails + open the lightbox from the main image
    await expect(page.getByRole("button", { name: "Mostra immagine 2" })).toBeVisible();
    await page.getByRole("button", { name: "Ingrandisci immagine" }).click();
    const dlg = page.getByRole("dialog", { name: /Anteprima immagini/ });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText(/1 \/ 2/)).toBeVisible();

    // Buttons navigate back and forth
    await dlg.getByRole("button", { name: "Immagine successiva" }).click();
    await expect(dlg.getByText(/2 \/ 2/)).toBeVisible();
    await expect(dlg.getByRole("img", { name: "Retro E2E" })).toBeVisible();
    await dlg.getByRole("button", { name: "Immagine precedente" }).click();
    await expect(dlg.getByText(/1 \/ 2/)).toBeVisible();

    // Keyboard: arrows navigate, Escape closes and focus returns to the image
    await page.keyboard.press("ArrowRight");
    await expect(dlg.getByText(/2 \/ 2/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ingrandisci immagine" })).toBeFocused();

    // Touch swipe left → next image (dialog reopens at the last viewed image,
    // so "next" wraps back to image 1)
    await page.getByRole("button", { name: "Ingrandisci immagine" }).click();
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText(/2 \/ 2/)).toBeVisible();
    const swiped = await page.evaluate(() => {
      const stage = document.querySelector("[class*='touch-pan-y']");
      if (!stage) return false;
      const makeTouch = (x: number) =>
        new Touch({ identifier: 1, target: stage as EventTarget, clientX: x, clientY: 400 });
      stage.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [makeTouch(300)],
          changedTouches: [makeTouch(300)],
        }),
      );
      stage.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          changedTouches: [makeTouch(120)],
        }),
      );
      return true;
    });
    expect(swiped).toBe(true);
    await expect(dlg.getByText(/1 \/ 2/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
  });
});
