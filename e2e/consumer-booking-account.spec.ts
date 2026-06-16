import { test, expect } from "@playwright/test";

const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;

test.describe("Consumer booking account linkage", () => {
  test("marina owner lands on dashboard after marina login", async ({ page }) => {
    test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD");

    await page.goto("/marina/login");
    await page.getByLabel(/email/i).fill(ownerEmail!);
    await page.getByLabel(/password/i).fill(ownerPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("consumer without marina membership cannot access dashboard", async ({ page }) => {
    test.skip(!process.env.E2E_CONSUMER_EMAIL || !process.env.E2E_CONSUMER_PASSWORD);

    await page.goto("/account/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_CONSUMER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_CONSUMER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/account/);
  });
});
