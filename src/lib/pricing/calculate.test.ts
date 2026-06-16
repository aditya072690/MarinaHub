import { describe, it, expect } from "vitest";
import { calculateBookingPrice } from "./calculate";

describe("calculateBookingPrice", () => {
  it("charges hourly rate × duration", () => {
    const start = new Date("2026-06-15T10:00:00Z");
    const end = new Date("2026-06-15T14:00:00Z");
    expect(
      calculateBookingPrice({
        hourlyRate: 75,
        startAt: start,
        endAt: end,
        minBookingHours: 2,
      })
    ).toBe(300);
  });

  it("enforces minimum booking hours", () => {
    const start = new Date("2026-06-15T10:00:00Z");
    const end = new Date("2026-06-15T11:00:00Z");
    expect(
      calculateBookingPrice({
        hourlyRate: 75,
        startAt: start,
        endAt: end,
        minBookingHours: 2,
      })
    ).toBe(150);
  });
});
