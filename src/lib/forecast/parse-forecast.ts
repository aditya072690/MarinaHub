import type { RevenueForecast } from "@/types/database";

export function parseRevenueForecast(raw: unknown): RevenueForecast {
  const data = raw as Record<string, unknown>;
  const daily = Array.isArray(data.daily)
    ? data.daily.map((d) => {
        const day = d as Record<string, unknown>;
        return {
          date: String(day.date),
          confirmed: Number(day.confirmed ?? 0),
          projected: Number(day.projected ?? 0),
          total: Number(day.total ?? 0),
          booking_count: Number(day.booking_count ?? 0),
        };
      })
    : [];

  const totalForecast = Number(data.total_forecast ?? 0);
  const confirmed = Number(data.confirmed_portion ?? 0);
  const projected = Number(data.projected_portion ?? 0);

  return {
    marina_id: String(data.marina_id ?? ""),
    period: {
      start: String((data.period as Record<string, unknown>)?.start ?? ""),
      end: String((data.period as Record<string, unknown>)?.end ?? ""),
    },
    total_forecast: totalForecast,
    confirmed_portion: confirmed,
    projected_portion: projected,
    daily,
    confidence: (data.confidence as RevenueForecast["confidence"]) ?? "low",
  };
}

/** Sum daily totals — used to validate RPC consistency in tests */
export function sumForecastDaily(forecast: RevenueForecast) {
  return forecast.daily.reduce(
    (acc, d) => ({
      confirmed: acc.confirmed + d.confirmed,
      projected: acc.projected + d.projected,
      total: acc.total + d.total,
    }),
    { confirmed: 0, projected: 0, total: 0 }
  );
}

export function deriveConfidence(
  confirmed: number,
  total: number
): RevenueForecast["confidence"] {
  if (total <= 0) return "low";
  const ratio = confirmed / total;
  if (ratio > 0.6) return "high";
  if (ratio > 0.3) return "medium";
  return "low";
}
