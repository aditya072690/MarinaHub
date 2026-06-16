import type { PricingRuleType } from "@/types/database";

/** Mirrors classify_pricing_day() priority in 031_pricing_rules.sql */
export function classifyPricingDayType(input: {
  isHoliday: boolean;
  isPeakSeason: boolean;
  dayOfWeek: number;
}): PricingRuleType {
  if (input.isHoliday) return "holiday";
  if (input.isPeakSeason) return "peak_season";
  if (input.dayOfWeek === 0 || input.dayOfWeek === 6) return "weekend";
  return "weekday";
}

export function isDateInPeakSeason(
  date: string,
  ranges: { peak_start: string; peak_end: string }[]
): boolean {
  return ranges.some((r) => date >= r.peak_start && date <= r.peak_end);
}

export function isHolidayDate(
  date: string,
  holidays: { date: string; is_recurring: boolean }[]
): boolean {
  const [, month, day] = date.split("-");
  return holidays.some((h) => {
    if (h.date === date) return true;
    if (!h.is_recurring) return false;
    const [, hMonth, hDay] = h.date.split("-");
    return hMonth === month && hDay === day;
  });
}
