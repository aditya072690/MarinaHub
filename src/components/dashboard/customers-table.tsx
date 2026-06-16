"use client";

import { CustomerSegmentBadge } from "@/components/dashboard/customer-segment-badge";
import { formatCurrency } from "@/lib/currency/format";
import { EmptyState } from "@/components/shared/empty-state";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import type { Customer, CustomerSegment } from "@/types/database";
import { ChevronRight, Filter, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CustomersTable({
  customers,
  segmentMap,
  timezone = DEFAULT_TIMEZONE,
  isFiltered = false,
}: {
  customers: Customer[];
  segmentMap: Map<string, CustomerSegment>;
  timezone?: string;
  isFiltered?: boolean;
}) {
  const router = useRouter();

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={isFiltered ? Filter : Users}
        title={isFiltered ? "No matching customers" : "No customers yet"}
        description={
          isFiltered
            ? "Try another segment or adjust your search."
            : "Customer profiles are created automatically when bookings are made."
        }
        actionLabel={isFiltered ? "View all customers" : "View bookings"}
        actionHref={
          isFiltered ? "/dashboard/customers" : "/dashboard/bookings"
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
            <th scope="col">Name</th>
            <th scope="col">Segment</th>
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col">Bookings</th>
            <th scope="col">Total Spent</th>
            <th scope="col">Last Booking</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} data-dash-row>
              <td>
                <Link
                  href={`/dashboard/customers/${c.id}`}
                  className="dash-table-link"
                >
                  {c.full_name}
                </Link>
              </td>
              <td>
                {segmentMap.has(c.id) ? (
                  <CustomerSegmentBadge segment={segmentMap.get(c.id)!} />
                ) : (
                  <span className="text-[#4A6580]">—</span>
                )}
              </td>
              <td>{c.email}</td>
              <td>{c.phone ?? "—"}</td>
              <td>{c.total_bookings}</td>
              <td className="font-medium">
                {formatCurrency(Number(c.total_spent))}
              </td>
              <td>
                {c.last_booking_at
                  ? formatInMarinaTimezone(
                      c.last_booking_at,
                      timezone,
                      "MMM d, yyyy"
                    )
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <div className="fleet-mobile-grid">
      {customers.map((c) => (
        <article
          key={c.id}
          className="fleet-mobile-card"
          data-dash-row
          onClick={() => router.push(`/dashboard/customers/${c.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              router.push(`/dashboard/customers/${c.id}`);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="fleet-mobile-card-top">
            <div className="fleet-mobile-title-row">
              <p className="fleet-mobile-title">{c.full_name}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#4A6580]" />
            </div>
            {segmentMap.has(c.id) && (
              <CustomerSegmentBadge segment={segmentMap.get(c.id)!} />
            )}
          </div>
          <div className="fleet-mobile-body">
            <div className="fleet-mobile-details">
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Email</span>
                <span className="fleet-mobile-detail-value">{c.email}</span>
              </div>
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Bookings</span>
                <span className="fleet-mobile-detail-value">
                  {c.total_bookings}
                </span>
              </div>
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Spent</span>
                <span className="fleet-mobile-detail-value">
                  {formatCurrency(Number(c.total_spent))}
                </span>
              </div>
              <div className="fleet-mobile-detail">
                <span className="fleet-mobile-detail-label">Last booking</span>
                <span className="fleet-mobile-detail-value">
                  {c.last_booking_at
                    ? formatInMarinaTimezone(
                        c.last_booking_at,
                        timezone,
                        "MMM d, yyyy"
                      )
                    : "—"}
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
