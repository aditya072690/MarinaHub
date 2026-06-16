import { getAnalyticsSummary } from "@/actions/analytics";
import { getMarinaRatingSummary } from "@/actions/reviews";
import { StatsCards } from "@/components/dashboard/stats-cards";

export async function DashboardStatsSection({ marinaId }: { marinaId: string }) {
  const [analytics, ratingSummary] = await Promise.all([
    getAnalyticsSummary(marinaId),
    getMarinaRatingSummary(marinaId),
  ]);

  return (
    <StatsCards
      data={analytics}
      revenueThisMonth={analytics.revenueThisMonth}
      avgRating={ratingSummary.avgRating}
      reviewCount={ratingSummary.reviewCount}
    />
  );
}
