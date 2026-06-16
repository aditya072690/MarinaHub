import { differenceInHours } from "date-fns";

interface PricingInput {
  hourlyRate: number;
  dailyRate?: number | null;
  startAt: Date;
  endAt: Date;
  minBookingHours: number;
}

export function calculateBookingPrice({
  hourlyRate,
  dailyRate,
  startAt,
  endAt,
  minBookingHours,
}: PricingInput): number {
  const hours = Math.max(
    differenceInHours(endAt, startAt),
    minBookingHours
  );

  if (dailyRate && hours >= 8) {
    const days = Math.ceil(hours / 24);
    const dailyTotal = days * dailyRate;
    const hourlyTotal = hours * hourlyRate;
    return Math.min(dailyTotal, hourlyTotal);
  }

  return Math.round(hours * hourlyRate * 100) / 100;
}
