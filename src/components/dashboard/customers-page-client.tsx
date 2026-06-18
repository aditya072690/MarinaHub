"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getCustomers, getSegmentSnapshots } from "@/actions/customers";
import { CustomersTableWithPagination } from "@/components/dashboard/customers-table-with-pagination";
import {
  buildFilterHref,
  DashboardFilterChips,
} from "@/components/dashboard/dashboard-filter-chips";
import { DashboardSearchForm } from "@/components/dashboard/dashboard-search-form";
import { DashCard, DashCardContent, DashPageHeader } from "@/components/dashboard/dash-card";
import { ExportButton } from "@/components/dashboard/export-button";
import { CustomersTableSkeleton } from "@/components/skeletons/customers-skeleton";
import type { CustomerSegment } from "@/types/database";
import Link from "next/link";
import { Suspense } from "react";

const FILTERS: { value: CustomerSegment | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "first_time", label: "First-Time" },
  { value: "returning", label: "Returning" },
  { value: "vip", label: "VIP" },
];

export function CustomersPageClient({
  marinaId,
  timezone,
  segmentFilter,
  search,
  cursor,
  canExport,
}: {
  marinaId: string;
  timezone: string;
  segmentFilter?: CustomerSegment;
  search?: string;
  cursor?: string;
  canExport: boolean;
}) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["customers", marinaId, segmentFilter, search, cursor],
    queryFn: async () => {
      const [customersData, segments] = await Promise.all([
        getCustomers(marinaId, {
          limit: 25,
          cursor,
          segment: segmentFilter,
          search,
        }),
        getSegmentSnapshots(marinaId),
      ]);
      return { ...customersData, segments };
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading || !data) {
    return <CustomersTableSkeleton />;
  }

  const { items: customers, nextCursor, segments } = data;
  const activeSegment = segmentFilter ?? "all";
  const filterParams = { segment: segmentFilter, search };

  const segmentMap = new Map(
    segments.map((s) => [s.customer_id, s.segment as CustomerSegment])
  );

  const filterChips = FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    href: buildFilterHref("/dashboard/customers", filterParams, "segment", f.value),
  }));

  return (
    <div className="dash-page" data-dash-page>
      <DashPageHeader
        title="Customers"
        description="View guest profiles, segments, and booking history."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canExport && (
              <ExportButton
                type="customers"
                label="Export Customers"
                disabled={customers.length === 0}
              />
            )}
            <Link
              href="/dashboard/customers/segments"
              className="text-sm font-medium text-[#1A9DC4] transition-colors hover:text-[#0B1F3A]"
            >
              Segment dashboard →
            </Link>
          </div>
        }
      />

      <div className="dash-data-panel" data-dash-animate>
        <div className="dash-data-toolbar-stack">
          <Suspense
            fallback={
              <div className="fleet-toolbar-search skeleton-shimmer h-10 rounded-lg" />
            }
          >
            <DashboardSearchForm placeholder="Search name, email, or phone…" />
          </Suspense>
          <DashboardFilterChips chips={filterChips} activeValue={activeSegment} />
        </div>

        <DashCard hover={false} data-dash-animate>
          <DashCardContent className={`p-0 sm:p-0 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
            <CustomersTableWithPagination
              customers={customers}
              segmentMap={segmentMap}
              nextCursor={nextCursor}
              timezone={timezone}
              segmentFilter={segmentFilter}
              search={search}
            />
          </DashCardContent>
        </DashCard>
      </div>
    </div>
  );
}
