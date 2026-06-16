import { getMarinaRatingSummary, getMarinaRecentReviews } from "@/actions/reviews";
import { RecentReviewsPanel } from "@/components/dashboard/analytics/recent-reviews-panel";

export async function DashboardReviewsSection({ marinaId }: { marinaId: string }) {
  const [ratingSummary, recentReviews] = await Promise.all([
    getMarinaRatingSummary(marinaId),
    getMarinaRecentReviews(marinaId, 8),
  ]);

  return (
    <RecentReviewsPanel
      reviews={recentReviews}
      avgRating={ratingSummary.avgRating}
      reviewCount={ratingSummary.reviewCount}
    />
  );
}
