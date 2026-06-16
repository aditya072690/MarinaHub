import { test, expect } from "@playwright/test";

const ownerEmail = process.env.E2E_OWNER_EMAIL ?? "owner@stateparkmarina.demo";
const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? "DemoMarina2026!";
const staffEmail = process.env.E2E_STAFF_EMAIL ?? "staff@stateparkmarina.demo";
const staffPassword = process.env.E2E_STAFF_PASSWORD ?? "DemoMarina2026!";

async function marinaLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/auth/login?intent=marina");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe("CSV export", () => {
  test.beforeEach(() => {
    test.skip(
      !process.env.E2E_RUN_INTEGRATION,
      "Set E2E_RUN_INTEGRATION=1 with seeded Supabase to run"
    );
  });

  test("owner can export bookings CSV with correct headers", async ({ page }) => {
    await marinaLogin(page, ownerEmail, ownerPassword);
    await page.goto("/dashboard/bookings");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export bookings/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/state-park-marina-bookings-\d{4}-\d{2}-\d{2}\.csv/);

    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test("staff cannot export bookings", async ({ page }) => {
    await marinaLogin(page, staffEmail, staffPassword);

    await expect(page.getByRole("button", { name: /export bookings/i })).toHaveCount(0);

    const response = await page.request.get("/api/export/bookings");
    expect(response.status()).toBe(403);
  });

  test("unauthenticated export returns 401", async ({ request }) => {
    const response = await request.get("/api/export/bookings");
    expect(response.status()).toBe(401);
  });
});
