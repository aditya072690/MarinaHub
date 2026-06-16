"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/dashboard/skeletons/chart-skeleton";
import type { RevenueForecast } from "@/types/database";

const RevenueForecastChartClient = dynamic(
  () =>
    import("@/components/dashboard/analytics/revenue-forecast-chart").then(
      (m) => m.RevenueForecastChart
    ),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> }
);

export function RevenueForecastChartLazy({
  forecast,
}: {
  forecast: RevenueForecast;
}) {
  return <RevenueForecastChartClient forecast={forecast} />;
}
