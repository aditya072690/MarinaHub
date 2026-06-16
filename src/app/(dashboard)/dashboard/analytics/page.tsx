import { getAnalyticsSummary } from "@/actions/analytics";
import { getActivityFeed } from "@/actions/audit-logs";
import { getRevenueForecast } from "@/actions/customer-segments";
import { getMarinaRatingSummary, getMarinaRecentReviews } from "@/actions/reviews";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { canViewAnalytics } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function AnalyticsPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  if (!canViewAnalytics(session.activeRole)) {
    redirect("/dashboard");
  }

  const marinaId = session.activeMarina.id;

  const [analytics, forecast, ratingSummary, recentReviews, initialActivityFeed] =
    await Promise.all([
      getAnalyticsSummary(marinaId),
      getRevenueForecast(marinaId, 30),
      getMarinaRatingSummary(marinaId),
      getMarinaRecentReviews(marinaId, 8),
      getActivityFeed(marinaId, 10),
    ]);

  return (
    <AnalyticsDashboard
      marinaId={marinaId}
      marinaName={session.activeMarina.name}
      title="Analytics"
      analytics={analytics}
      forecast={forecast}
      ratingSummary={ratingSummary}
      recentReviews={recentReviews}
      initialActivityFeed={initialActivityFeed}
    />
  );
}
