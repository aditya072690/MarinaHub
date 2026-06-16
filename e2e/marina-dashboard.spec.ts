import { test, expect } from "@playwright/test";

test.describe("Marina dashboard access", () => {
  test("redirects unauthenticated users to marina login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login\?intent=marina/);
  });

  test("audit logs route requires authentication", async ({ page }) => {
    await page.goto("/dashboard/audit-logs");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Auth UX", () => {
  test("forgot password page is reachable", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
  });
});
