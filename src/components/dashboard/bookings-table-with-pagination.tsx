"use client";

import { BookingsTable } from "@/components/dashboard/bookings-table";
import { DashboardSortSelect } from "@/components/dashboard/dashboard-sort-select";
import type { BookingWithRelations, UserRole } from "@/types/database";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type BookingSort =
  | "date-desc"
  | "date-asc"
  | "customer-asc"
  | "revenue-desc"
  | "revenue-asc";

const SORT_OPTIONS: { value: BookingSort; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "customer-asc", label: "Customer A–Z" },
  { value: "revenue-desc", label: "Highest revenue" },
  { value: "revenue-asc", label: "Lowest revenue" },
];

function sortBookings(bookings: BookingWithRelations[], sort: BookingSort) {
  const items = [...bookings];
  items.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      case "customer-asc":
        return (a.customers?.full_name ?? "").localeCompare(
          b.customers?.full_name ?? ""
        );
      case "revenue-desc":
        return Number(b.total_price) - Number(a.total_price);
      case "revenue-asc":
        return Number(a.total_price) - Number(b.total_price);
      case "date-desc":
      default:
        return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
    }
  });
  return items;
}

export function BookingsTableWithPagination({
  bookings,
  nextCursor,
  role,
  timezone,
  status,
  search,
  isFiltered = false,
}: {
  bookings: BookingWithRelations[];
  nextCursor: string | null;
  role: UserRole;
  timezone: string;
  status?: string;
  search?: string;
  isFiltered?: boolean;
}) {
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<BookingSort>("date-desc");

  const sortedBookings = useMemo(
    () => sortBookings(bookings, sort),
    [bookings, sort]
  );

  function buildHref(cursor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", cursor);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    return `/dashboard/bookings?${params.toString()}`;
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="fleet-toolbar-meta">
          Showing {sortedBookings.length} booking
          {sortedBookings.length === 1 ? "" : "s"}
        </p>
        <DashboardSortSelect
          value={sort}
          onValueChange={setSort}
          options={SORT_OPTIONS}
        />
      </div>

      <BookingsTable
        bookings={sortedBookings}
        role={role}
        timezone={timezone}
        isFiltered={isFiltered}
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
