import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should display login page with Google button and email form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("Accedi")).toBeVisible();
    await expect(page.getByText("Continua con Google")).toBeVisible();
    await expect(page.getByPlaceholder("tua@email.it")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continua", exact: true })).toBeVisible();
  });

  test("should redirect authenticated admin to dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Bentornato")).toBeVisible();
    await expect(page.getByText("admin@test.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();

    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("should reject wrong password", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Bentornato")).toBeVisible();

    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByText("Accedi").click();

    await expect(page.getByText("Email o password non validi.")).toBeVisible();
  });

  test("should show registration form for unknown email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("nuovo-utente@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Crea il tuo account")).toBeVisible();
    await expect(page.getByText("nuovo-utente@test.com")).toBeVisible();
    await expect(page.getByPlaceholder("Il tuo nome")).toBeVisible();
  });

  test("should register a new customer account", async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill(testEmail);
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Crea il tuo account")).toBeVisible();

    await page.getByPlaceholder("Il tuo nome").fill("Test User");
    await page.getByPlaceholder("Minimo 6 caratteri").fill("MyPassword123!");
    await page.getByText("Crea account e accedi").click();

    // Should redirect to homepage (CUSTOMER role)
    await expect(page).toHaveURL(/\/$/);
  });

  test("should show password form for existing customer email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("customer@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Bentornato")).toBeVisible();
    await expect(page.getByText("customer@test.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("should allow back navigation from password form", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Bentornato")).toBeVisible();

    await page.getByText("Usa un altro account").click();

    await expect(page.getByText("Accedi")).toBeVisible();
    await expect(page.getByText("Continua con Google")).toBeVisible();
  });

  test("should redirect unauthenticated admin access to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Admin Dashboard", () => {
  test("should display admin dashboard after login", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("admin@test.com")).toBeVisible();
  });

  test("should display admin sidebar with all links", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page.getByRole("link", { name: /Prodotti/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Categorie/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ordini/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Utenti/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sicurezza/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Blog/ })).toBeVisible();
  });

  test("should display user email and ADMIN badge in header", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page.getByText("admin@test.com")).toBeVisible();
    await expect(page.getByText("ADMIN", { exact: true })).toBeVisible();
  });
});

test.describe("Logout", () => {
  test("should logout and redirect to login, block admin access", async ({ page }) => {
    // Login first
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Click logout in admin header
    await page.getByTitle("Esci").click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/);

    // Try to access admin — should redirect to login again
    await page.goto("/admin/dashboard", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Role-based Access", () => {
  test("should redirect non-admin to login on admin route", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should show user email in shop header after login", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto("/");
    await expect(page.getByText("admin@test.com")).toBeVisible();
  });

  test("should have working account link in shop navbar", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto("/");
    // Wait for session to load
    await expect(page.getByText("admin@test.com")).toBeVisible({ timeout: 15000 });
    await page.getByLabel("Account").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});

test.describe("Auth API — check-email", () => {
  test("should detect admin email", async ({ page }) => {
    const response = await page.request.post("/api/auth/check-email", {
      data: { email: "admin@test.com" },
    });
    const json = await response.json();
    expect(json.exists).toBe(true);
    expect(json.role).toBe("ADMIN");
    expect(json.hasPassword).toBe(true);
  });

  test("should detect staff email", async ({ page }) => {
    const response = await page.request.post("/api/auth/check-email", {
      data: { email: "staff@test.com" },
    });
    const json = await response.json();
    expect(json.exists).toBe(true);
    expect(json.role).toBe("STAFF");
    expect(json.hasPassword).toBe(true);
  });

  test("should detect customer email", async ({ page }) => {
    const response = await page.request.post("/api/auth/check-email", {
      data: { email: "customer@test.com" },
    });
    const json = await response.json();
    expect(json.exists).toBe(true);
    expect(json.role).toBe("CUSTOMER");
    expect(json.hasPassword).toBe(true);
  });

  test("should return not found for unknown email", async ({ page }) => {
    const response = await page.request.post("/api/auth/check-email", {
      data: { email: "nonexistent@test.com" },
    });
    const json = await response.json();
    expect(json.exists).toBe(false);
  });

  test("should require email parameter", async ({ page }) => {
    const response = await page.request.post("/api/auth/check-email", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });
});
