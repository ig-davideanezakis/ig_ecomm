import { test, expect } from "@playwright/test";

function testEmail(suffix: string) {
  return `e2e-${suffix}-${Date.now()}@test.com`;
}

test.describe("Login Page", () => {
  test("should display login page with Google button and email form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("Accedi o registrati")).toBeVisible();
    await expect(page.getByText("Continua con Google")).toBeVisible();
    await expect(page.getByPlaceholder("tua@email.it")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continua", exact: true })).toBeVisible();
  });

  test("should register new user with email + password in one step and auto-login", async ({ page }) => {
    const email = testEmail("reg");
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill(email);
    await page.getByRole("button", { name: "Continua", exact: true }).click();

    await expect(page.getByText("Crea il tuo account")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByPlaceholder("Minimo 6 caratteri").fill("MyPass123!");
    await page.getByText("Registrati e accedi").click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("should redirect authenticated admin to dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await expect(page.getByText("Bentornato")).toBeVisible();
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

  test("should allow back navigation from password form", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await expect(page.getByText("Bentornato")).toBeVisible();

    await page.getByText("Usa un altro account").click();

    await expect(page.getByText("Accedi o registrati")).toBeVisible();
    await expect(page.getByText("Continua con Google")).toBeVisible();
  });

  test("should show forgot password link on password form", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await expect(page.getByText("Password dimenticata?")).toBeVisible();
  });

  test("should reset password and login for any role", async ({ page }) => {
    const email = testEmail("reset");
    // Create user via registration
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill(email);
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("Minimo 6 caratteri").fill("OriginalPass1");
    await page.getByText("Registrati e accedi").click();
    await expect(page).toHaveURL(/\/$/);

    // Logout by going to login page
    await page.goto("/auth/login");

    // Login with existing email
    await page.getByPlaceholder("tua@email.it").fill(email);
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await expect(page.getByText("Bentornato")).toBeVisible();

    // Forgot password flow
    await page.getByText("Password dimenticata?").click();
    await expect(page.getByText("Reimposta password")).toBeVisible();

    await page.getByPlaceholder("Minimo 6 caratteri").fill("NewPassword1");
    await page.getByText("Reimposta e accedi").click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("should show password form for existing customer email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("customer@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await expect(page.getByText("Bentornato")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
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
    await page.goto("/auth/login");
    await page.getByPlaceholder("tua@email.it").fill("admin@test.com");
    await page.getByRole("button", { name: "Continua", exact: true }).click();
    await page.getByPlaceholder("••••••••").fill("TestPass123!");
    await page.getByText("Accedi").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.getByTitle("Esci").click();
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto("/admin/dashboard", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Role-based Access", () => {
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
    await expect(page.getByText("admin@test.com")).toBeVisible({ timeout: 15000 });
    await page.getByLabel("Account").click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});

test.describe("Auth API — check-email", () => {
  test("should detect admin email", async ({ page }) => {
    const res = await page.request.post("/api/auth/check-email", { data: { email: "admin@test.com" } });
    const json = await res.json();
    expect(json.exists).toBe(true);
    expect(json.role).toBe("ADMIN");
    expect(json.hasPassword).toBe(true);
  });

  test("should detect staff email", async ({ page }) => {
    const res = await page.request.post("/api/auth/check-email", { data: { email: "staff@test.com" } });
    const json = await res.json();
    expect(json.exists).toBe(true);
    expect(json.role).toBe("STAFF");
    expect(json.hasPassword).toBe(true);
  });

  test("should detect customer email", async ({ page }) => {
    const res = await page.request.post("/api/auth/check-email", { data: { email: "customer@test.com" } });
    const json = await res.json();
    expect(json.exists).toBe(true);
    expect(json.role).toBe("CUSTOMER");
    expect(json.hasPassword).toBe(true);
  });

  test("should return not found for unknown email", async ({ page }) => {
    const res = await page.request.post("/api/auth/check-email", { data: { email: "nonexistent@test.com" } });
    const json = await res.json();
    expect(json.exists).toBe(false);
  });

  test("should require email parameter", async ({ page }) => {
    const res = await page.request.post("/api/auth/check-email", { data: {} });
    expect(res.status()).toBe(400);
  });
});
