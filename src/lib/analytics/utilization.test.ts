import { describe, it, expect } from "vitest";
import { computeBoatUtilization } from "./utilization";

describe("computeBoatUtilization", () => {
  const monthDate = new Date("2026-06-15T12:00:00Z");

  it("returns 0% when no bookings", () => {
    const result = computeBoatUtilization({
      boatId: "b1",
      boatName: "Boat A",
      bookings: [],
      blocks: [],
      monthDate,
    });
    expect(result.utilizationPct).toBe(0);
  });

  it("caps utilization at 100%", () => {
    const result = computeBoatUtilization({
      boatId: "b1",
      boatName: "Boat A",
      bookings: [
        {
          start_at: "2026-06-01T08:00:00Z",
          end_at: "2026-06-30T20:00:00Z",
          status: "confirmed",
        },
      ],
      blocks: [],
      operatingHoursPerDay: 10,
      monthDate,
    });
    expect(result.utilizationPct).toBeLessThanOrEqual(100);
  });

  it("applies marina-wide blocks to all boats", () => {
    const withBlock = computeBoatUtilization({
      boatId: "b1",
      boatName: "Boat A",
      bookings: [],
      blocks: [
        {
          boat_id: null,
          start_at: "2026-06-10T00:00:00Z",
          end_at: "2026-06-12T00:00:00Z",
        },
      ],
      operatingHoursPerDay: 10,
      monthDate,
    });
    const withoutBlock = computeBoatUtilization({
      boatId: "b1",
      boatName: "Boat A",
      bookings: [],
      blocks: [],
      operatingHoursPerDay: 10,
      monthDate,
    });
    expect(withBlock.availableHours).toBeLessThan(withoutBlock.availableHours);
  });

  it("ignores blocks for other boats", () => {
    const result = computeBoatUtilization({
      boatId: "b1",
      boatName: "Boat A",
      bookings: [],
      blocks: [
        {
          boat_id: "b2",
          start_at: "2026-06-10T00:00:00Z",
          end_at: "2026-06-12T00:00:00Z",
        },
      ],
      operatingHoursPerDay: 10,
      monthDate,
    });
    const baseline = computeBoatUtilization({
      boatId: "b1",
      boatName: "Boat A",
      bookings: [],
      blocks: [],
      operatingHoursPerDay: 10,
      monthDate,
    });
    expect(result.availableHours).toBe(baseline.availableHours);
  });
});
