import { getCustomers, getSegmentSnapshots } from "@/actions/customers";
import { CustomersTableWithPagination } from "@/components/dashboard/customers-table-with-pagination";
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
import type { CustomerSegment } from "@/types/database";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const revalidate = 30;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    segment?: string;
    cursor?: string;
    search?: string;
  }>;
}) {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const marinaId = session.activeMarina.id;
  const params = await searchParams;
  const segmentFilter = params.segment as CustomerSegment | undefined;

  const [{ items: customers, nextCursor }, segments] = await Promise.all([
    getCustomers(marinaId, {
      limit: 25,
      cursor: params.cursor,
      segment: segmentFilter,
      search: params.search,
    }),
    getSegmentSnapshots(marinaId),
  ]);

  const timezone = session.activeMarina.timezone ?? DEFAULT_TIMEZONE;
  const canExport = canExportData(session.activeRole, "customers");

  const segmentMap = new Map(
    segments.map((s) => [s.customer_id, s.segment as CustomerSegment])
  );

  const filters: { value: CustomerSegment | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "first_time", label: "First-Time" },
    { value: "returning", label: "Returning" },
    { value: "vip", label: "VIP" },
  ];

  const activeSegment = segmentFilter ?? "all";
  const filterParams = { segment: params.segment, search: params.search };

  const filterChips = filters.map((f) => ({
    value: f.value,
    label: f.label,
    href: buildFilterHref(
      "/dashboard/customers",
      filterParams,
      "segment",
      f.value
    ),
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
          <DashCardContent className="p-0 sm:p-0">
            <CustomersTableWithPagination
              customers={customers}
              segmentMap={segmentMap}
              nextCursor={nextCursor}
              timezone={timezone}
              segmentFilter={segmentFilter}
              search={params.search}
            />
          </DashCardContent>
        </DashCard>
      </div>
    </div>
  );
}
