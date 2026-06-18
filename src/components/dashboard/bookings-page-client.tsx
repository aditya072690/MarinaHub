"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getBookings } from "@/actions/bookings";
import { BookingsTableWithPagination } from "@/components/dashboard/bookings-table-with-pagination";
import {
  buildFilterHref,
  DashboardFilterChips,
} from "@/components/dashboard/dashboard-filter-chips";
import { DashboardSearchForm } from "@/components/dashboard/dashboard-search-form";
import { DashCard, DashCardContent, DashPageHeader } from "@/components/dashboard/dash-card";
import { ExportButton } from "@/components/dashboard/export-button";
import { BookingsTableSkeleton } from "@/components/skeletons/bookings-skeleton";
import type { BookingStatus, UserRole } from "@/types/database";
import { Suspense } from "react";

const STATUS_FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "cancelled", label: "Cancelled" },
];

export function BookingsPageClient({
  marinaId,
  role,
  timezone,
  status,
  search,
  cursor,
  canExport,
}: {
  marinaId: string;
  role: UserRole;
  timezone: string;
  status?: BookingStatus;
  search?: string;
  cursor?: string;
  canExport: boolean;
}) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["bookings", marinaId, status, search, cursor],
    queryFn: () => getBookings(marinaId, { status, search, cursor, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  if (isLoading || !data) {
    return <BookingsTableSkeleton />;
  }

  const { items: bookings, nextCursor } = data;
  const activeStatus = status ?? "all";
  const filterParams = { status, search };

  const filterChips = STATUS_FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    href: buildFilterHref("/dashboard/bookings", filterParams, "status", f.value),
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
            fallback={<div className="fleet-toolbar-search skeleton-shimmer h-10 rounded-lg" />}
          >
            <DashboardSearchForm placeholder="Search customer, email, or boat…" />
          </Suspense>
          <DashboardFilterChips chips={filterChips} activeValue={activeStatus} />
        </div>

        <DashCard hover={false} data-dash-animate>
          <DashCardContent className={`p-0 sm:p-0 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
            <BookingsTableWithPagination
              bookings={bookings}
              nextCursor={nextCursor}
              role={role}
              timezone={timezone}
              status={status}
              search={search}
              isFiltered={Boolean(status || search?.trim())}
            />
          </DashCardContent>
        </DashCard>
      </div>
    </div>
  );
}
