import {
  fetchBoatAvailability,
  getBusinessHoursForDate,
} from "@/lib/availability/fetch-availability";
import { generateHourlySlots, isSlotBookable } from "@/lib/availability/slots";
import { formatInMarinaTimezone, getMarinaDayBounds } from "@/lib/timezone";
import { addDays } from "date-fns";

export async function getNextAvailableSlot(
  marinaId: string,
  boatId: string,
  minBookingHours: number,
  timezone: string
): Promise<{ start: string; label: string } | null> {
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = addDays(now, dayOffset);
    const { start, end } = getMarinaDayBounds(date, timezone);

    const availability = await fetchBoatAvailability(
      marinaId,
      boatId,
      start,
      end
    );

    const dayHours = getBusinessHoursForDate(
      availability.business_hours,
      date,
      timezone
    );

    const slots = generateHourlySlots(
      date,
      minBookingHours,
      timezone,
      dayHours
    );

    for (const slot of slots) {
      if (
        !isSlotBookable(
          slot.start,
          slot.end,
          availability.bookings,
          availability.blocks,
          now
        )
      ) {
        continue;
      }

      return {
        start: slot.start.toISOString(),
        label: formatInMarinaTimezone(
          slot.start.toISOString(),
          timezone,
          "EEE, MMM d · h:mm a"
        ),
      };
    }
  }

  return null;
}
