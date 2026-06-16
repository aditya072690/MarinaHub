import { test, expect } from "@playwright/test";

test.describe("Waitlist public API", () => {
  test("rejects duplicate waitlist join", async ({ request }) => {
    test.skip(
      !process.env.E2E_RUN_INTEGRATION,
      "Set E2E_RUN_INTEGRATION=1 with seeded Supabase to run"
    );

    const marinaId = process.env.E2E_MARINA_ID;
    const boatId = process.env.E2E_BOAT_ID;
    test.skip(!marinaId || !boatId, "Set E2E_MARINA_ID and E2E_BOAT_ID");

    const payload = {
      marina_id: marinaId,
      boat_id: boatId,
      desired_start_at: "2026-08-01T10:00:00.000Z",
      desired_end_at: "2026-08-01T14:00:00.000Z",
      guest_count: 2,
      guest_name: "QA Tester",
      guest_email: "qa.waitlist@test.demo",
      guest_phone: "555-0100",
    };

    const first = await request.post("/api/v1/marinas/waitlist", { data: payload });
    expect(first.status()).toBeLessThan(500);

    if (first.ok()) {
      const second = await request.post("/api/v1/marinas/waitlist", { data: payload });
      expect(second.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
