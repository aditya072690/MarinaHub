import { BlockDateDialog } from "@/components/dashboard/block-form";
import { getAvailabilityBlocks } from "@/actions/availability";
import { getBoats } from "@/actions/boats";
import { getCalendarBookings } from "@/actions/bookings";
import { BookingCalendar } from "@/components/dashboard/booking-calendar";
import { DashCard, DashCardContent, DashPageHeader } from "@/components/dashboard/dash-card";
import { getSessionContext } from "@/lib/auth/session";
import { canManageBlocks } from "@/lib/auth/permissions";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { addDays, endOfMonth, startOfMonth, subDays } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const marinaId = session.activeMarina.id;
  const now = new Date();
  const rangeStart = subDays(startOfMonth(now), 7).toISOString();
  const rangeEnd = addDays(endOfMonth(now), 7).toISOString();

  const [boats, bookings, blocks] = await Promise.all([
    getBoats(marinaId),
    getCalendarBookings(marinaId, rangeStart, rangeEnd),
    getAvailabilityBlocks(marinaId, { startAfter: rangeStart, startBefore: rangeEnd }),
  ]);

  const canBlock = canManageBlocks(session.activeRole);

  return (
    <div className="dash-page" data-dash-page>
      <DashPageHeader
        title="Booking Calendar"
        description="Weekly view of fleet availability and reservations."
        actions={
          canBlock ? (
            <div className="flex flex-wrap gap-2">
              <BlockDateDialog marinaId={marinaId} boats={boats} />
              <Link href="/dashboard/availability" className="dash-load-more-btn">
                Manage blocks
              </Link>
              <Link href="/dashboard/maintenance" className="dash-load-more-btn">
                Maintenance logs
              </Link>
            </div>
          ) : undefined
        }
      />
      <DashCard hover={false} className="overflow-hidden" data-dash-animate>
        <DashCardContent className="p-0 sm:p-0">
          <BookingCalendar
            boats={boats}
            bookings={bookings}
            blocks={blocks}
            timezone={session.activeMarina.timezone ?? DEFAULT_TIMEZONE}
          />
        </DashCardContent>
      </DashCard>
    </div>
  );
}
