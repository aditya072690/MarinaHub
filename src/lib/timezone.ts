import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "America/New_York";

export function formatInMarinaTimezone(
  isoDate: string,
  timezone: string,
  pattern: string
): string {
  return formatInTimeZone(isoDate, timezone, pattern);
}

/**
 * Day/month/year from a calendar picker selection. The picker returns midnight in
 * the browser timezone — we treat those components as the marina calendar day.
 */
export function getCalendarDayParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}

/** Calendar day bounds in marina timezone, returned as UTC ISO strings. */
export function getMarinaDayBounds(date: Date, timezone: string) {
  const { year, month, day } = getCalendarDayParts(date);

  const start = fromZonedTime(new Date(year, month, day, 0, 0, 0, 0), timezone);
  const end = fromZonedTime(new Date(year, month, day, 23, 59, 59, 999), timezone);

  return { start: start.toISOString(), end: end.toISOString() };
}

/** Format a Date for display in marina timezone (e.g. slot buttons). */
export function formatMarinaLocal(date: Date, timezone: string, pattern: string) {
  return formatInTimeZone(date, timezone, pattern);
}

/** Booking date (yyyy-MM-dd) in marina timezone for weather highlight alignment. */
export function getBookingDateInMarinaTimezone(
  isoDate: string,
  timezone: string
): string {
  return formatInTimeZone(isoDate, timezone, "yyyy-MM-dd");
}

/** Parse local date + time strings in marina timezone to UTC Date. */
export function marinaLocalToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return fromZonedTime(new Date(year, month - 1, day, hours, minutes, 0, 0), timezone);
}

export function formatDateInputInMarina(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/** UTC bounds for a marina-local calendar day + hour (2-hour grid cells). */
export function getMarinaCellBounds(
  day: Date,
  hour: number,
  timezone: string,
  durationHours = 2
) {
  const { year, month, day: dayNum } = getCalendarDayParts(day);
  const cellStart = fromZonedTime(
    new Date(year, month, dayNum, hour, 0, 0, 0),
    timezone
  );
  const cellEnd = fromZonedTime(
    new Date(year, month, dayNum, hour + durationHours, 0, 0, 0),
    timezone
  );
  return { cellStart, cellEnd };
}

export function isSameMarinaCalendarDay(
  isoDate: string,
  day: Date,
  timezone: string
): boolean {
  const { year, month, day: dayNum } = getCalendarDayParts(day);
  const dayKey = formatInTimeZone(
    fromZonedTime(new Date(year, month, dayNum, 12, 0, 0, 0), timezone),
    timezone,
    "yyyy-MM-dd"
  );
  return formatInTimeZone(isoDate, timezone, "yyyy-MM-dd") === dayKey;
}
