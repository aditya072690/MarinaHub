import {
  differenceInMilliseconds,
  endOfMonth,
  getDaysInMonth,
  startOfMonth,
} from "date-fns";

export const DEFAULT_OPERATING_HOURS_PER_DAY = 10;

export interface UtilizationInput {
  boatId: string;
  boatName: string;
  bookings: { start_at: string; end_at: string; status: string }[];
  blocks: { start_at: string; end_at: string; boat_id: string | null }[];
  operatingHoursPerDay?: number;
  monthDate?: Date;
}

export interface BoatUtilization {
  id: string;
  name: string;
  utilizationPct: number;
  bookedHours: number;
  availableHours: number;
}

function overlapHours(
  rangeStart: Date,
  rangeEnd: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  const start = Math.max(rangeStart.getTime(), windowStart.getTime());
  const end = Math.min(rangeEnd.getTime(), windowEnd.getTime());
  if (end <= start) return 0;
  return differenceInMilliseconds(end, start) / (1000 * 60 * 60);
}

export function computeBoatUtilization(input: UtilizationInput): BoatUtilization {
  const now = input.monthDate ?? new Date();
  const windowStart = startOfMonth(now);
  const windowEnd = endOfMonth(now);
  const daysInMonth = getDaysInMonth(now);
  const hoursPerDay = input.operatingHoursPerDay ?? DEFAULT_OPERATING_HOURS_PER_DAY;

  let availableHours = daysInMonth * hoursPerDay;

  for (const block of input.blocks) {
    if (block.boat_id !== null && block.boat_id !== input.boatId) continue;
    availableHours -= overlapHours(
      new Date(block.start_at),
      new Date(block.end_at),
      windowStart,
      windowEnd
    );
  }

  availableHours = Math.max(availableHours, 1);

  let bookedHours = 0;
  for (const booking of input.bookings) {
    if (!["pending", "confirmed", "completed"].includes(booking.status)) continue;
    bookedHours += overlapHours(
      new Date(booking.start_at),
      new Date(booking.end_at),
      windowStart,
      windowEnd
    );
  }

  const utilizationPct = Math.min(100, Math.round((bookedHours / availableHours) * 100));

  return {
    id: input.boatId,
    name: input.boatName,
    utilizationPct,
    bookedHours: Math.round(bookedHours * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
  };
}
