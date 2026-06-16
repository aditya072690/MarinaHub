import { test, expect } from "@playwright/test";

test.describe("Consumer booking flow", () => {
  test("homepage loads and links to search", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /book your perfect day on the water/i })
    ).toBeVisible();
    await page.getByRole("link", { name: /explore/i }).first().click();
    await expect(page).toHaveURL(/\/search/);
  });
});

test.describe("Dashboard", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login\?intent=marina/);
  });
});
