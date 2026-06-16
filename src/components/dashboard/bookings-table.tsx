"use client";

import { BookingActions } from "@/components/dashboard/booking-actions";
import { formatCurrency } from "@/lib/currency/format";
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import type { BookingWithRelations, UserRole } from "@/types/database";
import { CalendarDays, ChevronRight, Filter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function BookingsTable({
  bookings,
  role,
  timezone = DEFAULT_TIMEZONE,
  isFiltered = false,
}: {
  bookings: BookingWithRelations[];
  role: UserRole;
  timezone?: string;
  isFiltered?: boolean;
}) {
  const router = useRouter();

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={isFiltered ? Filter : CalendarDays}
        title={isFiltered ? "No matching bookings" : "No bookings yet"}
        description={
          isFiltered
            ? "Try adjusting your search or status filter."
            : "Bookings from your website, widget, and dashboard will appear here."
        }
        actionLabel={isFiltered ? "Clear filters" : "View calendar"}
        actionHref={
          isFiltered ? "/dashboard/bookings" : "/dashboard/calendar"
        }
        className="border-0 py-8"
      />
    );
  }

  const table = (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Boat</th>
            <th scope="col">Date</th>
            <th scope="col">Guests</th>
            <th scope="col">Status</th>
            <th scope="col">Total</th>
            <th scope="col" className="w-48">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} data-dash-row>
              <td>
                <Link
                  href={`/dashboard/customers/${booking.customer_id}`}
                  className="dash-table-link"
                >
                  {booking.customers?.full_name}
                </Link>
                <p className="dash-table-meta">{booking.customers?.email}</p>
              </td>
              <td>
                <Link
                  href={`/dashboard/bookings/${booking.id}`}
                  className="dash-table-link"
                >
                  {booking.boats?.name}
                </Link>
              </td>
              <td>
                <p className="font-medium">
                  {formatInMarinaTimezone(
                    booking.start_at,
                    timezone,
                    "MMM d, yyyy"
                  )}
                </p>
                <p className="dash-table-meta">
                  {formatInMarinaTimezone(booking.start_at, timezone, "h:mm a")}{" "}
                  –{" "}
                  {formatInMarinaTimezone(booking.end_at, timezone, "h:mm a")}
                </p>
              </td>
              <td>{booking.guest_count}</td>
              <td>
                <BookingStatusBadge status={booking.status} />
              </td>
              <td className="font-medium">
                {formatCurrency(Number(booking.total_price))}
              </td>
              <td>
                <BookingActions booking={booking} role={role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <div className="fleet-mobile-grid">
      {bookings.map((booking) => (
        <article
          key={booking.id}
          className="fleet-mobile-card"
          data-dash-row
          onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              router.push(`/dashboard/bookings/${booking.id}`);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="fleet-mobile-card-top">
            <div className="fleet-mobile-title-row">
              <p className="fleet-mobile-title">{booking.customers?.full_name}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#4A6580]" />
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="fleet-mobile-body">
            <div className="fleet-mobile-details">
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Boat</span>
                <span className="fleet-mobile-detail-value">
                  {booking.boats?.name}
                </span>
              </div>
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Date</span>
                <span className="fleet-mobile-detail-value">
                  {formatInMarinaTimezone(
                    booking.start_at,
                    timezone,
                    "MMM d, yyyy"
                  )}
                </span>
              </div>
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Guests</span>
                <span className="fleet-mobile-detail-value">
                  {booking.guest_count}
                </span>
              </div>
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Total</span>
                <span className="fleet-mobile-detail-value">
                  {formatCurrency(Number(booking.total_price))}
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">{table}</div>
      <div className="lg:hidden">{cards}</div>
    </>
  );
}
