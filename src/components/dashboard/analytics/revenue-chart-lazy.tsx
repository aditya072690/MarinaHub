"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/dashboard/skeletons/chart-skeleton";
import type { AnalyticsSummary } from "@/types/api";

const RevenueChartClient = dynamic(
  () =>
    import("@/components/dashboard/revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export function RevenueChartLazy({
  monthlyData,
  dailyData,
}: {
  monthlyData: AnalyticsSummary["monthlyBookings"];
  dailyData: AnalyticsSummary["dailyBookings"];
}) {
  return <RevenueChartClient monthlyData={monthlyData} dailyData={dailyData} />;
}
