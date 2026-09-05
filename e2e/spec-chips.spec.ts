import { test, expect } from "@playwright/test";

const TITLE = `Notebook Chip E2E ${Date.now().toString(36)}`;

/**
 * Chip config is admin-editable (store_setting.spec_chips): it may contain any
 * number of chips with custom labels/patterns. This spec therefore builds the
 * product's spec rows dynamically — one row per configured chip, using the
 * chip's first match pattern as the row label — so the assertions hold for
 * whatever config is currently saved (default 6 chips, or a customized one).
 */
async function buildSpecsFromConfig(page: import("@playwright/test").Page): Promise<{
  specs: string;
  chips: { id: string; label: string; patterns: string[] }[];
}> {
  const settings = await (await page.request.get("/api/settings")).json();
  const chips: { id: string; label: string; patterns: string[] }[] = settings.spec_chips
    ? JSON.parse(settings.spec_chips)
    : [];
  const rows = chips
    .filter((c) => c.patterns?.length > 0)
    .map((c) => ({ label: c.patterns[0], value: CHIP_VALUES[c.id] ?? `Valore ${c.id}` }));
  return { specs: JSON.stringify([{ group: "Specifiche di test", rows }]), chips };
}

const CHIP_VALUES: Record<string, string> = {
  cpu: "Intel Core Ultra 7",
  ram: "32 GB",
  storage: "1 TB",
  os: "Windows 11 Pro",
};

test.describe("Spec chips — PDP and product list", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin so we can create a published product with specifications
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("renders spec chips on the product page and on the card in search results", async ({ page }) => {
    const { specs, chips } = await buildSpecsFromConfig(page);
    expect(chips.length).toBeGreaterThanOrEqual(6);

    const res = await page.request.post("/api/admin/products", {
      data: {
        title: TITLE,
        slug: "chip-e2e-laptop",
        barcode: "4719512030394",
        description: "Laptop creato per il test E2E delle chip specifiche",
        specifications: specs,
        basePrice: 999,
        published: true,
      },
    });
    const created = await res.json();
    expect(created.success).toBe(true);

    // ── Product detail page: chips with label + value under the description ──
    await page.goto(`/product/${created.slug}`);

    const chipsList = page.getByRole("list", { name: "Caratteristiche principali" });
    await expect(chipsList).toBeVisible();
    // One chip per configured chip whose pattern is covered by the specs
    await expect(chipsList.getByRole("listitem")).toHaveCount(chips.length);

    // Core chips show their extracted value when configured
    for (const [id, value] of Object.entries(CHIP_VALUES)) {
      if (chips.some((c) => c.id === id)) {
        await expect(chipsList.getByText(value)).toBeVisible();
      }
    }

    // Chip labels are visible in the detail variant
    const ramChip = chips.find((c) => c.id === "ram");
    if (ramChip) await expect(chipsList.getByText(ramChip.label, { exact: true })).toBeVisible();
    const gpuChip = chips.find((c) => c.id === "gpu");
    if (gpuChip) await expect(chipsList.getByText(gpuChip.label, { exact: true })).toBeVisible();

    // ── Product list (search): compact chips on the card ──
    await page.goto(`/products?search=${encodeURIComponent(TITLE)}`);

    const card = page.getByRole("link", { name: new RegExp(TITLE) }).first();
    await expect(card).toBeVisible();
    const cardChips = card.getByRole("list", { name: "Caratteristiche principali" });
    await expect(cardChips).toHaveCount(1);
    if (chips.some((c) => c.id === "cpu")) {
      await expect(cardChips.getByText("Intel Core Ultra 7")).toBeVisible();
    }
    if (chips.some((c) => c.id === "ram")) {
      await expect(cardChips.getByText("32 GB")).toBeVisible();
    }
  });
});
