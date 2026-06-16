import { getAnalyticsSummary } from "@/actions/analytics";
import { getActivityFeed } from "@/actions/audit-logs";
import { getStaffDashboardSummary } from "@/actions/bookings";
import { getRevenueForecast } from "@/actions/customer-segments";
import { getMarinaRatingSummary, getMarinaRecentReviews } from "@/actions/reviews";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { StaffDashboardSummary } from "@/components/dashboard/staff-dashboard-summary";
import { canViewAnalytics } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function DashboardPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const marinaId = session.activeMarina.id;
  const marinaName = session.activeMarina.name;
  const timezone = session.activeMarina.timezone;

  if (!canViewAnalytics(session.activeRole)) {
    const [staffSummary, initialActivityFeed] = await Promise.all([
      getStaffDashboardSummary(marinaId, timezone),
      getActivityFeed(marinaId, 10),
    ]);

    return (
      <StaffDashboardSummary
        marinaId={marinaId}
        marinaName={marinaName}
        timezone={timezone}
        staffSummary={staffSummary}
        initialActivityFeed={initialActivityFeed}
      />
    );
  }

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
      marinaName={marinaName}
      title="Dashboard"
      analytics={analytics}
      forecast={forecast}
      ratingSummary={ratingSummary}
      recentReviews={recentReviews}
      initialActivityFeed={initialActivityFeed}
    />
  );
}
