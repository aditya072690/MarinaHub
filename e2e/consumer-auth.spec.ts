import { test, expect } from "@playwright/test";

test.describe("Consumer auth & account", () => {
  test("persona picker routes to consumer and marina login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome to marinahub/i })).toBeVisible();

    await page.getByRole("button", { name: /continue as customer/i }).click();
    await expect(page).toHaveURL(/\/auth\/login.*intent=consumer/);

    await page.goto("/login");
    await page.getByRole("button", { name: /continue as marina/i }).click();
    await expect(page).toHaveURL(/\/auth\/login.*intent=marina/);
  });

  test("logged-out account access redirects to consumer login", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth\/login.*intent=consumer/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe("/account");
  });

  test("logged-out dashboard redirects to marina login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login.*intent=marina/);
  });
});
