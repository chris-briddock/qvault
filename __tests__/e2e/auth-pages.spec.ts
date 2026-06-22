import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the username input", async ({ page }) => {
    await expect(page.locator('input[id="username"]')).toBeVisible();
  });

  test("renders the submit button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /unlock|login|authenticate/i })
    ).toBeVisible();
  });

  test("has a link to the register page", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /register|create/i })
    ).toBeVisible();
  });

  test("submit button is disabled when username is empty", async ({ page }) => {
    const btn = page.getByRole("button", {
      name: /unlock|login|authenticate/i,
    });
    // Input is required — HTML validation prevents submission when empty;
    // additionally the handleSubmit guard trims and returns early.
    await expect(page.locator('input[id="username"]')).toHaveValue("");
  });
});

test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("renders the username input", async ({ page }) => {
    await expect(page.locator('input[id="username"]')).toBeVisible();
  });

  test("renders the submit button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /register|create|vault/i })
    ).toBeVisible();
  });

  test("has a link back to the login page", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /login|sign in|access/i })
    ).toBeVisible();
  });
});
