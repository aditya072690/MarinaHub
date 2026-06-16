import { getAnalyticsSummary } from "@/actions/analytics";
import { RevenueChartLazy } from "@/components/dashboard/analytics/revenue-chart-lazy";

export async function DashboardRevenueChartSection({ marinaId }: { marinaId: string }) {
  const analytics = await getAnalyticsSummary(marinaId);

  return (
    <RevenueChartLazy
      monthlyData={analytics.monthlyBookings}
      dailyData={analytics.dailyBookings}
    />
  );
}
