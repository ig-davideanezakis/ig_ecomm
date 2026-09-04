import { test, expect } from "@playwright/test";

const TITLE = `Notebook Chip E2E ${Date.now().toString(36)}`;

// Grouped JSON grounded in real Icecat IT labels — every default chip matches.
const SPECS = JSON.stringify([
  {
    group: "Processore",
    rows: [{ label: "Famiglia processore", value: "Intel Core Ultra 7" }],
  },
  {
    group: "Memoria",
    rows: [{ label: "RAM installata", value: "32 GB" }],
  },
  {
    group: "Archiviazione",
    rows: [{ label: "Capacità memoria integrata", value: "1 TB" }],
  },
  {
    group: "Display",
    rows: [{ label: "Dimensioni diagonale schermo", value: '35,6 cm (14")' }],
  },
  {
    group: "Grafica",
    rows: [{ label: "Processore grafico", value: "Intel Arc Graphics" }],
  },
  {
    group: "Software",
    rows: [{ label: "Sistema operativo incluso", value: "Windows 11 Pro" }],
  },
]);

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
    const res = await page.request.post("/api/admin/products", {
      data: {
        title: TITLE,
        slug: "chip-e2e-laptop",
        barcode: "4719512030394",
        description: "Laptop creato per il test E2E delle chip specifiche",
        specifications: SPECS,
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
    await expect(chipsList.getByRole("listitem")).toHaveCount(6);

    await expect(chipsList.getByText("Intel Core Ultra 7")).toBeVisible();
    await expect(chipsList.getByText("32 GB")).toBeVisible();
    await expect(chipsList.getByText("1 TB")).toBeVisible();
    await expect(chipsList.getByText("Windows 11 Pro")).toBeVisible();
    // Chip labels are visible in the detail variant
    await expect(chipsList.getByText("RAM", { exact: true })).toBeVisible();
    await expect(chipsList.getByText("Scheda video", { exact: true })).toBeVisible();

    // ── Product list (search): compact chips on the card ──
    await page.goto(`/products?search=${encodeURIComponent(TITLE)}`);

    const card = page.getByRole("link", { name: new RegExp(TITLE) }).first();
    await expect(card).toBeVisible();
    const cardChips = card.getByRole("list", { name: "Caratteristiche principali" });
    await expect(cardChips).toHaveCount(1);
    await expect(cardChips.getByText("Intel Core Ultra 7")).toBeVisible();
    await expect(cardChips.getByText("32 GB")).toBeVisible();
    await expect(cardChips.getByText("1 TB")).toBeVisible();
  });
});
