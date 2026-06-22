import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the app name heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("has a link to the login page", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /login|sign in|access/i });
    await expect(loginLink).toBeVisible();
  });

  test("has a link to the register page", async ({ page }) => {
    await page.goto("/");
    const registerLink = page.getByRole("link", {
      name: /register|create|get started/i,
    });
    await expect(registerLink).toBeVisible();
  });

  test("page title contains QVault", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/QVault/i);
  });
});
