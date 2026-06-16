import { test, expect } from "@playwright/test";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

test.describe("RBAC route guards", () => {
  test("staff is redirected from fleet management", async ({ page }) => {
    test.skip(!staffEmail || !staffPassword, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD");

    await page.goto("/marina/login");
    await page.getByLabel(/email/i).fill(staffEmail!);
    await page.getByLabel(/password/i).fill(staffPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/dashboard/boats");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("unauthenticated users cannot access fleet", async ({ page }) => {
    await page.goto("/dashboard/boats");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.url()).toContain("intent=marina");
  });
});
