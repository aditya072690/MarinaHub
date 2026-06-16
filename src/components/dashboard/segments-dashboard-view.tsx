"use client";

import { formatCurrency } from "@/lib/currency/format";
import { CustomerSegmentBadge } from "@/components/dashboard/customer-segment-badge";
import { DashboardSortSelect } from "@/components/dashboard/dashboard-sort-select";
import {
  DashCard,
  DashCardContent,
} from "@/components/dashboard/dash-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSegmentLabel } from "@/lib/segmentation/classify-customer";
import type { CustomerSegment } from "@/types/database";
import { PieChart, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type SegmentRow = {
  customer_id: string;
  segment: CustomerSegment;
  completed_bookings: number;
  total_spent: number | string;
  customers: { full_name: string };
};

type SegmentSort = "name-asc" | "bookings-desc" | "spent-desc";
type SegmentFilter = CustomerSegment | "all";

const SORT_OPTIONS: { value: SegmentSort; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "bookings-desc", label: "Most bookings" },
  { value: "spent-desc", label: "Highest spend" },
];

export function SegmentsDashboardView({
  segments,
  summary,
}: {
  segments: SegmentRow[];
  summary: Record<
    CustomerSegment,
    { count: number; pct: number; avgSpend: number }
  >;
}) {
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [sort, setSort] = useState<SegmentSort>("spent-desc");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = segments.filter((s) => {
      if (segmentFilter !== "all" && s.segment !== segmentFilter) return false;
      if (!query) return true;
      return s.customers.full_name.toLowerCase().includes(query);
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "bookings-desc":
          return b.completed_bookings - a.completed_bookings;
        case "name-asc":
          return a.customers.full_name.localeCompare(b.customers.full_name);
        case "spent-desc":
        default:
          return Number(b.total_spent) - Number(a.total_spent);
      }
    });

    return rows;
  }, [segments, search, segmentFilter, sort]);

  return (
    <>
      <div className="dash-stat-grid" data-dash-animate>
        {(["first_time", "returning", "vip"] as const).map((key) => (
          <div key={key} className="dash-stat-card">
            <p className="dash-stat-value">{summary[key].count}</p>
            <p className="dash-stat-label">{getSegmentLabel(key)}</p>
            <p className="dash-stat-detail">{summary[key].pct}% of customers</p>
            <p className="dash-stat-detail">
              Avg spend:{" "}
              {formatCurrency(summary[key].avgSpend, "INR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        ))}
      </div>

      {segments.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No customers to segment"
          description="Segments appear once customers complete bookings."
          actionLabel="View customers"
          actionHref="/dashboard/customers"
        />
      ) : (
        <DashCard hover={false} data-dash-animate>
          <DashCardContent className="space-y-4 p-4 sm:p-5">
            <div className="fleet-toolbar">
              <div className="fleet-toolbar-search relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A6580]"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers…"
                  className="h-10 border-[rgba(11,31,58,0.12)] bg-white pl-9 text-sm shadow-sm"
                  aria-label="Search customers"
                />
              </div>
              <Select
                value={segmentFilter}
                onValueChange={(v) => setSegmentFilter(v as SegmentFilter)}
              >
                <SelectTrigger className="fleet-toolbar-select h-10 border-[rgba(11,31,58,0.12)] bg-white text-sm shadow-sm">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All segments</SelectItem>
                  <SelectItem value="first_time">First-Time</SelectItem>
                  <SelectItem value="returning">Returning</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
              <DashboardSortSelect
                value={sort}
                onValueChange={setSort}
                options={SORT_OPTIONS}
              />
            </div>

            <p className="fleet-toolbar-meta">
              Showing {filtered.length} of {segments.length} customers
            </p>

            {filtered.length === 0 ? (
              <p className="fleet-empty-filter py-8 text-center text-sm text-[#4A6580]">
                No customers match your filters.
              </p>
            ) : (
              <>
                <div className="hidden lg:block dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th scope="col">Customer</th>
                        <th scope="col">Segment</th>
                        <th scope="col">Bookings</th>
                        <th scope="col">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.customer_id} data-dash-row>
                          <td>
                            <Link
                              href={`/dashboard/customers/${s.customer_id}`}
                              className="dash-table-link"
                            >
                              {s.customers.full_name}
                            </Link>
                          </td>
                          <td>
                            <CustomerSegmentBadge segment={s.segment} />
                          </td>
                          <td>{s.completed_bookings}</td>
                          <td className="font-medium">
                            {formatCurrency(Number(s.total_spent))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="fleet-mobile-grid lg:hidden">
                  {filtered.map((s) => (
                    <article key={s.customer_id} className="fleet-mobile-card">
                      <div className="fleet-mobile-card-top">
                        <Link
                          href={`/dashboard/customers/${s.customer_id}`}
                          className="fleet-mobile-title dash-table-link"
                        >
                          {s.customers.full_name}
                        </Link>
                        <CustomerSegmentBadge segment={s.segment} />
                      </div>
                      <div className="fleet-mobile-body">
                        <div className="fleet-mobile-details">
                          <div className="fleet-mobile-detail">
                            <span className="fleet-mobile-detail-label">
                              Bookings
                            </span>
                            <span className="fleet-mobile-detail-value">
                              {s.completed_bookings}
                            </span>
                          </div>
                          <div className="fleet-mobile-detail">
                            <span className="fleet-mobile-detail-label">
                              Total spent
                            </span>
                            <span className="fleet-mobile-detail-value">
                              {formatCurrency(Number(s.total_spent))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </DashCardContent>
        </DashCard>
      )}
    </>
  );
}
