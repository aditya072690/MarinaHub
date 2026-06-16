import type { getStaffDashboardSummary } from "@/actions/bookings";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
  DashSection,
} from "@/components/dashboard/dash-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import type { AuditLog } from "@/types/database";
import { Calendar, ClipboardList } from "lucide-react";
import Link from "next/link";

type StaffSummary = Awaited<ReturnType<typeof getStaffDashboardSummary>>;

export function StaffDashboardSummary({
  marinaId,
  marinaName,
  timezone = DEFAULT_TIMEZONE,
  staffSummary,
  initialActivityFeed,
}: {
  marinaId: string;
  marinaName: string;
  timezone?: string;
  staffSummary: StaffSummary;
  initialActivityFeed: AuditLog[];
}) {
  return (
    <div className="dash-page" data-dash-page>
      <DashSection
        title="Operations"
        description={`Today's schedule for ${marinaName}`}
      >
        <div className="dash-insights-grid !grid-cols-1 sm:!grid-cols-3">
          <div className="dash-insight-card">
            <p className="dash-insight-label">Today&apos;s bookings</p>
            <p className="dash-insight-value">{staffSummary.todaysCount}</p>
          </div>
          <div className="dash-insight-card">
            <p className="dash-insight-label">Pending confirmation</p>
            <p className="dash-insight-value">{staffSummary.pendingCount}</p>
          </div>
          <DashCard hover={false}>
            <DashCardHeader>
              <DashCardTitle>Quick actions</DashCardTitle>
            </DashCardHeader>
            <DashCardContent className="flex flex-col gap-2 !pt-0">
              <Link
                href="/dashboard/bookings"
                className={cn(buttonVariants({ size: "sm" }), "justify-start")}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                View bookings
              </Link>
              <Link
                href="/dashboard/calendar"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "justify-start"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Open calendar
              </Link>
            </DashCardContent>
          </DashCard>
        </div>

        <DashCard className="mt-4">
          <DashCardHeader>
            <DashCardTitle>Upcoming bookings</DashCardTitle>
          </DashCardHeader>
          <DashCardContent className="space-y-3">
            {staffSummary.upcoming.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming bookings today"
                description="Today's confirmed and pending trips will show here."
                actionLabel="View calendar"
                actionHref="/dashboard/calendar"
                className="border-0 py-6"
              />
            ) : (
              staffSummary.upcoming.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${booking.id}`}
                  className="flex items-center justify-between rounded-xl border border-[rgba(11,31,58,0.08)] bg-white/60 p-3 transition-colors hover:bg-white"
                >
                  <p className="font-medium text-[#0B1F3A]">
                    {formatInMarinaTimezone(
                      booking.start_at,
                      timezone,
                      "EEE, MMM d · h:mm a"
                    )}
                  </p>
                  <BookingStatusBadge status={booking.status} />
                </Link>
              ))
            )}
          </DashCardContent>
        </DashCard>
      </DashSection>

      <DashSection title="Activity" description="Recent marina events">
        <ActivityFeed
          marinaId={marinaId}
          limit={10}
          compact
          initialItems={initialActivityFeed}
        />
      </DashSection>
    </div>
  );
}
