"use client";

import { CustomersTable } from "@/components/dashboard/customers-table";
import { DashboardSortSelect } from "@/components/dashboard/dashboard-sort-select";
import type { Customer, CustomerSegment } from "@/types/database";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type CustomerSort =
  | "name-asc"
  | "name-desc"
  | "bookings-desc"
  | "spent-desc"
  | "last-booking-desc";

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "bookings-desc", label: "Most bookings" },
  { value: "spent-desc", label: "Highest spend" },
  { value: "last-booking-desc", label: "Recent activity" },
];

function sortCustomers(customers: Customer[], sort: CustomerSort) {
  const items = [...customers];
  items.sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.full_name.localeCompare(a.full_name);
      case "bookings-desc":
        return b.total_bookings - a.total_bookings;
      case "spent-desc":
        return Number(b.total_spent) - Number(a.total_spent);
      case "last-booking-desc": {
        const aTime = a.last_booking_at
          ? new Date(a.last_booking_at).getTime()
          : 0;
        const bTime = b.last_booking_at
          ? new Date(b.last_booking_at).getTime()
          : 0;
        return bTime - aTime;
      }
      case "name-asc":
      default:
        return a.full_name.localeCompare(b.full_name);
    }
  });
  return items;
}

export function CustomersTableWithPagination({
  customers,
  segmentMap,
  nextCursor,
  timezone,
  segmentFilter,
  search,
}: {
  customers: Customer[];
  segmentMap: Map<string, CustomerSegment>;
  nextCursor: string | null;
  timezone: string;
  segmentFilter?: CustomerSegment;
  search?: string;
}) {
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<CustomerSort>("name-asc");

  const sortedCustomers = useMemo(
    () => sortCustomers(customers, sort),
    [customers, sort]
  );

  function buildHref(cursor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", cursor);
    if (segmentFilter) params.set("segment", segmentFilter);
    if (search) params.set("search", search);
    return `/dashboard/customers?${params.toString()}`;
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="fleet-toolbar-meta">
          Showing {sortedCustomers.length} customer
          {sortedCustomers.length === 1 ? "" : "s"}
        </p>
        <DashboardSortSelect
          value={sort}
          onValueChange={setSort}
          options={SORT_OPTIONS}
        />
      </div>

      <CustomersTable
        customers={sortedCustomers}
        segmentMap={segmentMap}
        timezone={timezone}
        isFiltered={Boolean(segmentFilter || search?.trim())}
      />

      {nextCursor && (
        <div className="dash-load-more">
          <Link href={buildHref(nextCursor)} className="dash-load-more-btn">
            Load more
          </Link>
        </div>
      )}
    </div>
  );
}
