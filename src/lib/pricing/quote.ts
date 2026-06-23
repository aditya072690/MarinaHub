import type { AlternativeBoat, PriceQuote } from "@/types/database";

export function parsePriceQuote(raw: unknown): PriceQuote {
  const data = raw as Record<string, unknown>;
  return {
    base_price: Number(data.base_price ?? 0),
    tax_amount: Number(data.tax_amount ?? 0),
    deposit_amount: Number(data.deposit_amount ?? 0),
    total_price: Number(data.total_price ?? data.subtotal_with_tax ?? 0),
    pricing_rule_id: (data.pricing_rule_id as string) ?? null,
    rule_type: (data.rule_type as PriceQuote["rule_type"]) ?? "weekday",
    rule_label: String(data.rule_label ?? "Standard Rate"),
    hourly_rate: Number(data.hourly_rate ?? 0),
    daily_rate: data.daily_rate != null ? Number(data.daily_rate) : null,
    hours: Number(data.hours ?? 0),
    currency: String(data.currency ?? "INR"),
    breakdown: (data.breakdown as Record<string, unknown>) ?? {},
  };
}

export function parseAlternativeBoats(raw: unknown): AlternativeBoat[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const b = item as Record<string, unknown>;
    return {
      boat_id: String(b.boat_id),
      name: String(b.name),
      capacity: Number(b.capacity),
      boat_type: b.boat_type != null ? String(b.boat_type) : null,
      image_url: b.image_url != null ? String(b.image_url) : null,
      estimated_total: Number(b.estimated_total),
      estimated_base: Number(b.estimated_base),
      rule_label: String(b.rule_label ?? ""),
      score: Number(b.score ?? 0),
      availability_confirmed: Boolean(b.availability_confirmed),
    };
  });
}
