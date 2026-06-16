import { createAdminClient } from "@/lib/supabase/admin";

export interface AvailabilityRange {
  start_at: string;
  end_at: string;
  boat_id?: string | null;
}

export interface BusinessDayHours {
  open: string;
  close: string;
  closed?: boolean;
}

export type BusinessHoursConfig = Record<string, BusinessDayHours>;

export interface BoatAvailabilityResult {
  bookings: AvailabilityRange[];
  blocks: AvailabilityRange[];
  booking_buffer_minutes: number;
  business_hours: BusinessHoursConfig;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function getBusinessHoursForDate(
  businessHours: BusinessHoursConfig,
  date: Date,
  timezone: string
): BusinessDayHours | undefined {
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  })
    .format(date)
    .toLowerCase()
    .slice(0, 3);

  const key = DAY_KEYS.find((k) => k === dayLabel) ?? "mon";
  return businessHours[key];
}

function expandRangeWithBuffer(
  startAt: string,
  endAt: string,
  bufferMinutes: number
): AvailabilityRange {
  const bufferMs = bufferMinutes * 60_000;
  return {
    start_at: new Date(new Date(startAt).getTime() - bufferMs).toISOString(),
    end_at: new Date(new Date(endAt).getTime() + bufferMs).toISOString(),
  };
}

/**
 * Fetches overlapping bookings and blocks for a boat using the service role.
 * RLS blocks anon reads on bookings/blocks; this is the server-side source of truth.
 */
export async function fetchBoatAvailability(
  marinaId: string,
  boatId: string,
  start: string,
  end: string
): Promise<BoatAvailabilityResult> {
  const supabase = createAdminClient();

  const [bookingsRes, blocksRes, settingsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("start_at, end_at")
      .eq("marina_id", marinaId)
      .eq("boat_id", boatId)
      .in("status", ["pending", "confirmed", "checked_in", "checked_out"])
      .lt("start_at", end)
      .gt("end_at", start),
    supabase
      .from("availability_blocks")
      .select("start_at, end_at, boat_id")
      .eq("marina_id", marinaId)
      .or(`boat_id.eq.${boatId},boat_id.is.null`)
      .lt("start_at", end)
      .gt("end_at", start),
    supabase
      .from("marina_settings")
      .select("booking_buffer_minutes, business_hours")
      .eq("marina_id", marinaId)
      .maybeSingle(),
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (blocksRes.error) throw new Error(blocksRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  const bufferMinutes = settingsRes.data?.booking_buffer_minutes ?? 30;
  const businessHours =
    (settingsRes.data?.business_hours as BusinessHoursConfig | undefined) ?? {};

  return {
    bookings: (bookingsRes.data ?? []).map((b) =>
      expandRangeWithBuffer(b.start_at, b.end_at, bufferMinutes)
    ),
    blocks: blocksRes.data ?? [],
    booking_buffer_minutes: bufferMinutes,
    business_hours: businessHours,
  };
}
