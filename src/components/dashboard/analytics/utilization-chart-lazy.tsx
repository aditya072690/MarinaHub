"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/dashboard/skeletons/chart-skeleton";
import type { BoatUtilization } from "@/lib/analytics/utilization";

const UtilizationChartClient = dynamic(
  () =>
    import("@/components/dashboard/analytics/utilization-chart").then(
      (m) => m.UtilizationChart
    ),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> }
);

export function UtilizationChartLazy({ data }: { data: BoatUtilization[] }) {
  return <UtilizationChartClient data={data} />;
}
