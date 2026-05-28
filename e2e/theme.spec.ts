import { test, expect } from "@playwright/test";

test.describe("Theme behavior on first visit", () => {
  test.beforeEach(async ({ context }) => {
    // Clear localStorage to simulate first visit
    await context.addInitScript(() => localStorage.clear());
  });

  test("default theme is dark on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("logo uses correct foreground color in dark mode on first paint", async ({
    page,
  }) => {
    // Navigate and wait for no console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check no hydration or theme-related console errors
    const themeErrors = consoleErrors.filter(
      (e) =>
        e.includes("theme") ||
        e.includes("hydration") ||
        e.includes("Hydration") ||
        e.includes("currentColor"),
    );
    expect(themeErrors).toEqual([]);

    // The SVG should have currentColor fill which inherits from parent text color
    // In dark mode, text-foreground resolves to #fafafa (white-ish)
    // Get the computed color of the SVG text
    const logoColor = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const text = svg.querySelector("text");
      if (!text) return null;
      return window.getComputedStyle(text).color;
    });

    // In dark mode, the color should be a light color (not dark #111)
    expect(logoColor).not.toBe("rgb(17, 17, 17)"); // #111111
    expect(logoColor).toBe("rgb(250, 250, 250)"); // #fafafa
  });
});

test.describe("Theme toggle dark/light", () => {
  test("theme toggle switches from dark to light and back", async ({
    page,
  }) => {
    await page.goto("/");

    // Should start dark
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Click the theme toggle button
    const toggle = page.locator('[aria-label*="tema" i], [aria-label*="theme" i]').first();
    await toggle.click();

    // Should now be light (no dark class)
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Click again
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("logo color changes when switching theme", async ({ page }) => {
    await page.goto("/");

    // Get logo color in dark mode
    const darkColor = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const text = svg.querySelector("text");
      if (!text) return null;
      return window.getComputedStyle(text).color;
    });
    expect(darkColor).toBe("rgb(250, 250, 250)"); // #fafafa white in dark

    // Toggle to light mode
    const toggle = page.locator('[aria-label*="tema" i], [aria-label*="theme" i]').first();
    await toggle.click();
    await page.waitForTimeout(400); // wait for transition

    // Get logo color in light mode
    const lightColor = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const text = svg.querySelector("text");
      if (!text) return null;
      return window.getComputedStyle(text).color;
    });
    expect(lightColor).toBe("rgb(17, 17, 17)"); // #111111 black in light
  });
});

test.describe("Theme persistence", () => {
  test("theme persists after page reload", async ({ page }) => {
    await page.goto("/");

    // Switch to light mode
    const toggle = page.locator('[aria-label*="tema" i], [aria-label*="theme" i]').first();
    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Reload and check theme persists
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Logo should still be in light mode color
    const logoColor = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const text = svg.querySelector("text");
      if (!text) return null;
      return window.getComputedStyle(text).color;
    });
    expect(logoColor).toBe("rgb(17, 17, 17)");
  });

  test("first visit has no hydration errors in console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Clear storage for fresh visit
    await page.addInitScript(() => localStorage.clear());

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out irrelevant errors (like favicon)
    const relevantErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("503"),
    );

    expect(relevantErrors).toEqual([]);
  });
});

test.describe("Theme script injection", () => {
  test("inline theme script exists in page HTML", async ({ page }) => {
    // Check that the inline script was injected by reading the page source
    const hasScript = await page.evaluate(() => {
      const scripts = document.querySelectorAll("script");
      return Array.from(scripts).some((s) =>
        s.textContent?.includes("localStorage.getItem('theme')"),
      );
    });
    expect(hasScript).toBe(true);
  });

  test("red accent rect is always #ff0c3c regardless of theme", async ({
    page,
  }) => {
    await page.goto("/");

    // Check in dark mode
    const rectFill = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const rect = svg.querySelector("rect");
      return rect?.getAttribute("fill");
    });
    expect(rectFill).toBe("#ff0c3c");

    // Switch to light mode
    const toggle = page.locator('[aria-label*="tema" i], [aria-label*="theme" i]').first();
    await toggle.click();
    await page.waitForTimeout(400);

    // Check in light mode — should still be #ff0c3c
    const rectFillLight = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const rect = svg.querySelector("rect");
      return rect?.getAttribute("fill");
    });
    expect(rectFillLight).toBe("#ff0c3c");
  });
});
