import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("navigates from landing to login", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /login|sign in|access/i }).first();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("navigates from landing to register", async ({ page }) => {
    await page.goto("/");
    const registerLink = page
      .getByRole("link", { name: /register|create|get started/i })
      .first();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("navigates from login to register via in-page link", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /register|create/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("navigates from register to login via in-page link", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: /login|sign in|access/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user visiting /dashboard is redirected", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should redirect to login or landing since no session cookie is set
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test("unauthenticated user visiting /vault is redirected", async ({
    page,
  }) => {
    await page.goto("/vault");
    await expect(page).not.toHaveURL(/^http:\/\/localhost:3000\/vault$/);
  });

  test("health endpoint returns JSON", async ({ page }) => {
    const res = await page.request.get("/api/health");
    // May be 200 or 503 depending on whether SurrealDB is running in CI
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
  });
});
