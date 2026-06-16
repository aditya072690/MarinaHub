import { describe, it, expect } from "vitest";
import { parseAlternativeBoats, parsePriceQuote } from "./quote";

describe("parsePriceQuote", () => {
  it("parses RPC JSON into PriceQuote", () => {
    const quote = parsePriceQuote({
      base_price: 150,
      tax_amount: 12.38,
      deposit_amount: 40.59,
      total_price: 162.38,
      pricing_rule_id: "rule-1",
      rule_type: "weekend",
      rule_label: "Weekend Rate",
      hourly_rate: 93.75,
      daily_rate: 600,
      hours: 4,
      currency: "USD",
      breakdown: { tax_rate: 0.0825, deposit_pct: 25 },
    });

    expect(quote.base_price).toBe(150);
    expect(quote.tax_amount).toBe(12.38);
    expect(quote.rule_label).toBe("Weekend Rate");
    expect(quote.rule_type).toBe("weekend");
    expect(quote.currency).toBe("USD");
  });

  it("defaults missing fields safely", () => {
    const quote = parsePriceQuote({});
    expect(quote.base_price).toBe(0);
    expect(quote.rule_label).toBe("Standard Rate");
    expect(quote.rule_type).toBe("weekday");
  });
});

describe("parseAlternativeBoats", () => {
  it("parses ranked alternatives array", () => {
    const alts = parseAlternativeBoats([
      {
        boat_id: "b1",
        name: "Pontoon A",
        capacity: 8,
        boat_type: "pontoon",
        image_url: null,
        estimated_total: 200,
        estimated_base: 180,
        rule_label: "Weekend Rate",
        score: 85.5,
        availability_confirmed: true,
      },
    ]);

    expect(alts).toHaveLength(1);
    expect(alts[0].name).toBe("Pontoon A");
    expect(alts[0].score).toBe(85.5);
  });

  it("returns empty array for non-array input", () => {
    expect(parseAlternativeBoats(null)).toEqual([]);
    expect(parseAlternativeBoats({})).toEqual([]);
  });
});
