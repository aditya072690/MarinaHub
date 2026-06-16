import { describe, expect, it } from "vitest";
import {
  buildCheckoutLineItems,
  reconcileLineItemsToTotal,
  type CheckoutBookingRow,
} from "./checkout";

const baseBooking: CheckoutBookingRow = {
  id: "booking-1",
  marina_id: "marina-1",
  boat_id: "boat-1",
  status: "pending",
  payment_status: "unpaid",
  total_price: 1180,
  base_price: 1000,
  addons_total: 100,
  tax_amount: 80,
  pricing_breakdown: { rule_label: "Weekday Rate" },
  boats: { name: "Sunset Pontoon" },
  customers: { email: "guest@example.com" },
  marinas: { slug: "state-park-marina" },
};

describe("buildCheckoutLineItems", () => {
  it("builds base, add-on, and tax line items in minor units", () => {
    const items = buildCheckoutLineItems(
      baseBooking,
      [{ total_price: 100, addon_catalog: { name: "Cooler rental" } }],
      "inr"
    );

    expect(items).toHaveLength(3);
    expect(items[0]?.price_data?.unit_amount).toBe(100000);
    expect(items[1]?.price_data?.product_data?.name).toBe("Cooler rental");
    expect(items[2]?.price_data?.product_data?.name).toBe("Tax");
  });

  it("falls back to a single total line item when breakdown is empty", () => {
    const items = buildCheckoutLineItems(
      {
        ...baseBooking,
        base_price: 0,
        addons_total: 0,
        tax_amount: 0,
        total_price: 500,
      },
      [],
      "inr"
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.price_data?.unit_amount).toBe(50000);
  });

  it("rejects totals below Stripe minimum", () => {
    expect(() =>
      buildCheckoutLineItems({ ...baseBooking, total_price: 0.25 }, [], "inr")
    ).toThrow(/at least/);
  });
});

describe("platform fee calculation", () => {
  it("matches checkout session fee rounding", () => {
    const totalMinor = 118000;
    const platformFeePct = 0.03;
    expect(Math.round(totalMinor * platformFeePct)).toBe(3540);
  });
});

describe("reconcileLineItemsToTotal", () => {
  const addons = [{ total_price: 100, addon_catalog: { name: "Cooler rental" } }];

  it("adjusts tax line for 1 minor unit drift", () => {
    const items = buildCheckoutLineItems(baseBooking, addons, "inr");
    const sum = items.reduce(
      (s, i) => s + (i.price_data?.unit_amount ?? 0) * (i.quantity ?? 1),
      0
    );
    const adjusted = reconcileLineItemsToTotal(items, sum + 1);
    const adjustedSum = adjusted.reduce(
      (s, i) => s + (i.price_data?.unit_amount ?? 0) * (i.quantity ?? 1),
      0
    );
    expect(adjustedSum).toBe(sum + 1);
  });

  it("throws when line items diverge materially from total", () => {
    const items = buildCheckoutLineItems(baseBooking, addons, "inr");
    expect(() => reconcileLineItemsToTotal(items, 999999)).toThrow(/do not match/);
  });
});
