import { describe, it, expect } from "vitest";
import { mapRpcAnalyticsToSummary } from "./fetch-summary";

describe("mapRpcAnalyticsToSummary", () => {
  it("maps RPC payload to AnalyticsSummary", () => {
    const summary = mapRpcAnalyticsToSummary({
      total_boats: 2,
      total_bookings: 10,
      total_revenue: 5000,
      revenue_this_month: 1200,
      upcoming_trips: 3,
      monthly_bookings: [{ month: "Jun 2026", count: 5, revenue: 800 }],
      daily_bookings: [{ date: "Jun 1", count: 1, revenue: 200 }],
      popular_boats: [
        { id: "b1", name: "Boat A", booking_count: 4, revenue: 900 },
      ],
      utilization_bookings: [
        {
          boat_id: "b1",
          start_at: "2026-06-10T10:00:00Z",
          end_at: "2026-06-10T14:00:00Z",
          status: "confirmed",
        },
      ],
      utilization_blocks: [],
      boats: [{ id: "b1", name: "Boat A" }],
      operating_hours: 10,
    });

    expect(summary.totalBoats).toBe(2);
    expect(summary.revenueThisMonth).toBe(1200);
    expect(summary.popularBoats[0]?.bookingCount).toBe(4);
    expect(summary.utilization).toHaveLength(1);
  });
});
