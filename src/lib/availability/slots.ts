import { addHours, isBefore, isEqual } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { BusinessDayHours } from "@/lib/availability/fetch-availability";
import { DEFAULT_TIMEZONE, getCalendarDayParts } from "@/lib/timezone";

export interface TimeRange {
  start_at: string;
  end_at: string;
}

function parseHourMinute(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour: hour ?? 8, minute: minute ?? 0 };
}

export function generateHourlySlots(
  date: Date,
  minHours: number = 2,
  timezone: string = DEFAULT_TIMEZONE,
  dayHours?: BusinessDayHours
): { start: Date; end: Date }[] {
  if (dayHours?.closed) return [];

  const { year, month, day } = getCalendarDayParts(date);
  const open = parseHourMinute(dayHours?.open ?? "08:00");
  const close = parseHourMinute(dayHours?.close ?? "20:00");

  const dayStart = fromZonedTime(
    new Date(year, month, day, open.hour, open.minute, 0),
    timezone
  );
  const dayEnd = fromZonedTime(
    new Date(year, month, day, close.hour, close.minute, 0),
    timezone
  );
  const slots: { start: Date; end: Date }[] = [];

  let current = dayStart;
  while (
    isBefore(addHours(current, minHours), dayEnd) ||
    isEqual(addHours(current, minHours), dayEnd)
  ) {
    const end = addHours(current, minHours);
    slots.push({ start: current, end });
    current = addHours(current, 1);
  }

  return slots;
}

export function isSlotBlocked(
  slotStart: Date,
  slotEnd: Date,
  bookings: TimeRange[],
  blocks: TimeRange[]
): boolean {
  const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && aEnd > bStart;

  for (const b of bookings) {
    if (overlaps(slotStart, slotEnd, new Date(b.start_at), new Date(b.end_at))) {
      return true;
    }
  }
  for (const b of blocks) {
    if (overlaps(slotStart, slotEnd, new Date(b.start_at), new Date(b.end_at))) {
      return true;
    }
  }
  return false;
}

/** A slot must start in the future and not overlap bookings/blocks. */
export function isSlotBookable(
  slotStart: Date,
  slotEnd: Date,
  bookings: TimeRange[],
  blocks: TimeRange[],
  now: Date = new Date()
): boolean {
  if (slotStart <= now) return false;
  return !isSlotBlocked(slotStart, slotEnd, bookings, blocks);
}
