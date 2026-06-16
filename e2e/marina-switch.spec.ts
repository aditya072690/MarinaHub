import { test, expect } from "@playwright/test";

const ownerEmail = process.env.E2E_OWNER_EMAIL ?? "owner@stateparkmarina.demo";
const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? "DemoMarina2026!";

test.describe("Multi-marina switch isolation", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.E2E_RUN_INTEGRATION,
      "Set E2E_RUN_INTEGRATION=1 with seeded Supabase to run"
    );

    await page.goto("/auth/login?intent=marina");
    await page.getByLabel(/email/i).fill(ownerEmail);
    await page.getByLabel(/password/i).fill(ownerPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("switching marina updates dashboard context", async ({ page }) => {
    const switcher = page.getByRole("button", { name: /marina/i }).first();
    await expect(switcher).toBeVisible();
    await switcher.click();

    const harborOption = page.getByRole("menuitem", { name: /harbor/i });
    if (await harborOption.isVisible()) {
      await harborOption.click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/harbor/i).first()).toBeVisible();
    }
  });
});
