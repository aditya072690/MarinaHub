import { describe, expect, it } from "vitest";
import type { MarinaWeatherForecast } from "@/lib/weather/open-meteo";
import { computeLakeConditions, computeWeatherWarnings } from "@/lib/weather/warnings";

function makeForecast(overrides: Partial<MarinaWeatherForecast> = {}): MarinaWeatherForecast {
  return {
    current: {
      tempF: 72,
      humidity: 50,
      windMph: 8,
      windGustMph: 10,
      weatherCode: 0,
      condition: "Clear",
      icon: "sun",
      precipitationMm: 0,
    },
    daily: [
      {
        date: "2026-06-13",
        highF: 80,
        lowF: 60,
        windMaxMph: 8,
        precipProbPct: 20,
        weatherCode: 0,
        condition: "Clear",
        icon: "sun",
      },
    ],
    warnings: [],
    lakeConditions: "Good",
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeWeatherWarnings", () => {
  it("flags high wind above 15 mph", () => {
    const forecast = makeForecast({
      daily: [
        {
          date: "2026-06-13",
          highF: 80,
          lowF: 60,
          windMaxMph: 18,
          precipProbPct: 10,
          weatherCode: 0,
          condition: "Clear",
          icon: "sun",
        },
      ],
    });
    const warnings = computeWeatherWarnings(forecast);
    expect(warnings.some((w) => w.type === "wind")).toBe(true);
  });

  it("flags rain when precip probability exceeds 50%", () => {
    const forecast = makeForecast({
      daily: [
        {
          date: "2026-06-13",
          highF: 70,
          lowF: 55,
          windMaxMph: 8,
          precipProbPct: 70,
          weatherCode: 63,
          condition: "Rain",
          icon: "rain",
        },
      ],
    });
    const warnings = computeWeatherWarnings(forecast);
    expect(warnings.some((w) => w.type === "rain")).toBe(true);
  });
});

describe("computeLakeConditions", () => {
  it("returns Calm for calm weather", () => {
    expect(computeLakeConditions(makeForecast())).toBe("Calm");
  });

  it("returns Rough for high wind", () => {
    const forecast = makeForecast({
      current: { ...makeForecast().current, windMph: 20 },
    });
    expect(computeLakeConditions(forecast)).toBe("Rough");
  });
});
