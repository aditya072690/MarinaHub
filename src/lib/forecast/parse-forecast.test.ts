import { describe, it, expect } from "vitest";
import {
  deriveConfidence,
  parseRevenueForecast,
  sumForecastDaily,
} from "./parse-forecast";

describe("parseRevenueForecast", () => {
  it("parses RPC forecast payload", () => {
    const forecast = parseRevenueForecast({
      marina_id: "marina-1",
      period: { start: "2026-06-13", end: "2026-07-12" },
      total_forecast: 15000,
      confirmed_portion: 9000,
      projected_portion: 6000,
      confidence: "medium",
      daily: [
        { date: "2026-06-13", confirmed: 500, projected: 200, total: 700, booking_count: 2 },
        { date: "2026-06-14", confirmed: 0, projected: 400, total: 400, booking_count: 0 },
      ],
    });

    expect(forecast.marina_id).toBe("marina-1");
    expect(forecast.daily).toHaveLength(2);
    expect(forecast.confidence).toBe("medium");
  });

  it("daily sums align with portions when RPC is consistent", () => {
    const forecast = parseRevenueForecast({
      marina_id: "m1",
      period: { start: "2026-06-13", end: "2026-06-14" },
      total_forecast: 1100,
      confirmed_portion: 500,
      projected_portion: 600,
      confidence: "medium",
      daily: [
        { date: "2026-06-13", confirmed: 500, projected: 200, total: 700, booking_count: 1 },
        { date: "2026-06-14", confirmed: 0, projected: 400, total: 400, booking_count: 0 },
      ],
    });

    const sums = sumForecastDaily(forecast);
    expect(sums.confirmed).toBe(500);
    expect(sums.projected).toBe(600);
    expect(sums.total).toBe(1100);
  });
});

describe("deriveConfidence", () => {
  it("returns high when confirmed dominates", () => {
    expect(deriveConfidence(7000, 10000)).toBe("high");
  });

  it("returns low when mostly projected", () => {
    expect(deriveConfidence(1000, 10000)).toBe("low");
  });
});
