import { test, expect } from "@playwright/test";

const consumerEmail = process.env.E2E_CONSUMER_EMAIL ?? "alex.rivera@demo.com";
const consumerPassword = process.env.E2E_CONSUMER_PASSWORD ?? "DemoMarina2026!";
const runIntegration = process.env.E2E_RUN_INTEGRATION === "1";

test.describe("Reviews flow (integration)", () => {
  test.beforeEach(() => {
    test.skip(!runIntegration, "Set E2E_RUN_INTEGRATION=1 with seeded Supabase");
  });

  test("consumer can open past trips and see review CTA or submitted state", async ({
    page,
  }) => {
    await page.goto("/account/login");
    await page.getByLabel(/email/i).fill(consumerEmail);
    await page.getByLabel(/password/i).fill(consumerPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/account/trips?tab=past");
    await expect(page.getByRole("heading", { name: /my trips/i })).toBeVisible();

    const reviewButton = page.getByRole("button", { name: /leave a review/i });
    const submittedLabel = page.getByText(/review submitted/i);

    const hasReviewCta = await reviewButton.count();
    const hasSubmitted = await submittedLabel.count();

    expect(hasReviewCta + hasSubmitted).toBeGreaterThan(0);
  });

  test("home page explore marinas map section renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /explore marinas/i })).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  });

  test("search map toggle preserves query params", async ({ page }) => {
    await page.goto("/search?location=Columbia");
    await page.getByRole("button", { name: /^map$/i }).click();
    await expect(page).toHaveURL(/view=map/);
    await expect(page).toHaveURL(/location=Columbia/);
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  });
});
