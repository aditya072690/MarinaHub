import { describe, it, expect } from "vitest";
import { computeCustomerSegment } from "./classify-customer";

describe("computeCustomerSegment", () => {
  it("classifies first-time with zero completed bookings", () => {
    expect(computeCustomerSegment({ completed_bookings: 0, total_spent: 0 })).toBe(
      "first_time"
    );
  });

  it("classifies returning with at least one booking below VIP thresholds", () => {
    expect(
      computeCustomerSegment({ completed_bookings: 2, total_spent: 400 })
    ).toBe("returning");
  });

  it("classifies VIP by booking count threshold", () => {
    expect(
      computeCustomerSegment({ completed_bookings: 5, total_spent: 100 })
    ).toBe("vip");
  });

  it("classifies VIP by spend threshold", () => {
    expect(
      computeCustomerSegment({ completed_bookings: 1, total_spent: 2500 })
    ).toBe("vip");
  });

  it("manual VIP override takes precedence", () => {
    expect(
      computeCustomerSegment({
        completed_bookings: 0,
        total_spent: 0,
        manual_vip: true,
      })
    ).toBe("vip");
  });

  it("respects custom thresholds from marina_settings", () => {
    expect(
      computeCustomerSegment(
        { completed_bookings: 3, total_spent: 1000 },
        { vip_min_bookings: 3, vip_min_spend: 5000 }
      )
    ).toBe("vip");
  });
});
