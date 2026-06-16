import { getBookings } from "@/actions/bookings";
import { BookingsTableWithPagination } from "@/components/dashboard/bookings-table-with-pagination";
import {
  buildFilterHref,
  DashboardFilterChips,
} from "@/components/dashboard/dashboard-filter-chips";
import { DashboardSearchForm } from "@/components/dashboard/dashboard-search-form";
import { DashCard, DashCardContent, DashPageHeader } from "@/components/dashboard/dash-card";
import { ExportButton } from "@/components/dashboard/export-button";
import { canExportData } from "@/lib/export/auth";
import { getSessionContext } from "@/lib/auth/session";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import type { BookingStatus } from "@/types/database";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as BookingStatus)
      : undefined;

  const { items: bookings, nextCursor } = await getBookings(
    session.activeMarina.id,
    {
      limit: 20,
      cursor: params.cursor,
      status,
      search: params.search,
    }
  );

  const canExport = canExportData(session.activeRole, "bookings");
  const activeStatus = status ?? "all";
  const filterParams = { status: params.status, search: params.search };

  const filterChips = STATUS_FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    href: buildFilterHref(
      "/dashboard/bookings",
      filterParams,
      "status",
      f.value
    ),
  }));

  return (
    <div className="dash-page" data-dash-page>
      <DashPageHeader
        title="Bookings"
        description="Manage reservations, check-ins, and cancellations."
        actions={
          canExport ? (
            <ExportButton
              type="bookings"
              label="Export Bookings"
              disabled={bookings.length === 0}
            />
          ) : undefined
        }
      />

      <div className="dash-data-panel" data-dash-animate>
        <div className="dash-data-toolbar-stack">
          <Suspense
            fallback={
              <div className="fleet-toolbar-search skeleton-shimmer h-10 rounded-lg" />
            }
          >
            <DashboardSearchForm placeholder="Search customer, email, or boat…" />
          </Suspense>
          <DashboardFilterChips chips={filterChips} activeValue={activeStatus} />
        </div>

        <DashCard hover={false} data-dash-animate>
          <DashCardContent className="p-0 sm:p-0">
            <BookingsTableWithPagination
              bookings={bookings}
              nextCursor={nextCursor}
              role={session.activeRole!}
              timezone={session.activeMarina.timezone ?? DEFAULT_TIMEZONE}
              status={params.status}
              search={params.search}
              isFiltered={Boolean(status || params.search?.trim())}
            />
          </DashCardContent>
        </DashCard>
      </div>
    </div>
  );
}
