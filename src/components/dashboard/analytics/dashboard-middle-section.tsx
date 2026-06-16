import { getRevenueForecast } from "@/actions/customer-segments";
import { RevenueForecastChartLazy } from "@/components/dashboard/analytics/revenue-forecast-chart-lazy";
import { RecentReviewsPanel } from "@/components/dashboard/analytics/recent-reviews-panel";
import { getMarinaRatingSummary, getMarinaRecentReviews } from "@/actions/reviews";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export async function DashboardMiddleSection({
  marinaId,
  showActivityFeed = true,
  showForecast = true,
}: {
  marinaId: string;
  showActivityFeed?: boolean;
  showForecast?: boolean;
}) {
  const [forecast, ratingSummary, recentReviews] = await Promise.all([
    showForecast ? getRevenueForecast(marinaId, 30) : Promise.resolve(null),
    getMarinaRatingSummary(marinaId),
    getMarinaRecentReviews(marinaId, 6),
  ]);

  if (!showActivityFeed) {
    return forecast ? <RevenueForecastChartLazy forecast={forecast} /> : null;
  }

  return (
    <div className="dash-chart-grid">
      <ActivityFeed marinaId={marinaId} compact limit={10} />
      {forecast ? (
        <RevenueForecastChartLazy forecast={forecast} />
      ) : (
        <RecentReviewsPanel
          reviews={recentReviews}
          avgRating={ratingSummary.avgRating}
          reviewCount={ratingSummary.reviewCount}
        />
      )}
    </div>
  );
}
