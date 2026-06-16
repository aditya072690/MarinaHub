import { AnalyticsEmptyState } from "@/components/dashboard/analytics/analytics-empty-state";
import { PopularBoatsRanking } from "@/components/dashboard/analytics/popular-boats-ranking";
import { RecentReviewsPanel } from "@/components/dashboard/analytics/recent-reviews-panel";
import { RevenueForecastChartLazy } from "@/components/dashboard/analytics/revenue-forecast-chart-lazy";
import { RevenueChartLazy } from "@/components/dashboard/analytics/revenue-chart-lazy";
import { UtilizationChartLazy } from "@/components/dashboard/analytics/utilization-chart-lazy";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DashPageHeader, DashSection } from "@/components/dashboard/dash-card";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import type { AnalyticsSummary } from "@/types/api";
import type { AuditLog, RevenueForecast } from "@/types/database";

type RatingSummary = { avgRating: number | null; reviewCount: number };
type RecentReview = Awaited<
  ReturnType<typeof import("@/actions/reviews").getMarinaRecentReviews>
>[number];

export function AnalyticsDashboard({
  marinaId,
  marinaName,
  title = "Dashboard",
  showActivityFeed = true,
  showForecast = true,
  analytics,
  forecast,
  ratingSummary,
  recentReviews,
  initialActivityFeed,
}: {
  marinaId: string;
  marinaName: string;
  title?: string;
  showActivityFeed?: boolean;
  showForecast?: boolean;
  analytics: AnalyticsSummary;
  forecast: RevenueForecast | null;
  ratingSummary: RatingSummary;
  recentReviews: RecentReview[];
  initialActivityFeed: AuditLog[];
}) {
  const hasNoData =
    analytics.totalBoats === 0 && analytics.totalBookings === 0;

  return (
    <div className="dash-page" data-dash-page>
      <DashPageHeader
        title={title}
        description={`Welcome back to ${marinaName}`}
      />

      {hasNoData ? (
        <AnalyticsEmptyState
          title="Your dashboard is ready"
          description="Complete onboarding or add boats to start tracking revenue and utilization."
          href="/dashboard/boats"
          actionLabel="Set up fleet"
        />
      ) : (
        <>
          <DashSection title="Overview" description="Key metrics at a glance">
            <StatsCards
              data={analytics}
              revenueThisMonth={analytics.revenueThisMonth}
              avgRating={ratingSummary.avgRating}
              reviewCount={ratingSummary.reviewCount}
            />
          </DashSection>

          <DashSection
            title="Activity & forecast"
            description="Live updates and projected revenue"
          >
            {showActivityFeed ? (
              <div className="dash-chart-grid">
                <ActivityFeed
                  marinaId={marinaId}
                  compact
                  limit={10}
                  initialItems={initialActivityFeed}
                />
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
            ) : forecast ? (
              <RevenueForecastChartLazy forecast={forecast} />
            ) : null}
          </DashSection>
        </>
      )}

      {!hasNoData && (
        <>
          <DashSection
            title="Trends"
            description="Booking volume and revenue over time"
          >
            <RevenueChartLazy
              monthlyData={analytics.monthlyBookings}
              dailyData={analytics.dailyBookings}
            />
          </DashSection>

          <DashSection
            title="Fleet performance"
            description="Utilization and popularity"
          >
            <div className="dash-chart-grid">
              <DashCard hover={false}>
                <DashCardHeader>
                  <DashCardTitle className="dash-card-title-lg">
                    Boat Utilization (This Month)
                  </DashCardTitle>
                </DashCardHeader>
                <DashCardContent className="dash-card-content--chart !pt-3">
                  <UtilizationChartLazy data={analytics.utilization} />
                </DashCardContent>
              </DashCard>
              <DashCard hover={false}>
                <DashCardHeader>
                  <DashCardTitle className="dash-card-title-lg">
                    Popular Boats (90 days)
                  </DashCardTitle>
                </DashCardHeader>
                <DashCardContent className="!pt-3">
                  <PopularBoatsRanking boats={analytics.popularBoats} />
                </DashCardContent>
              </DashCard>
            </div>
          </DashSection>

          <DashSection
            title="Guest feedback"
            description="Recent reviews and ratings"
          >
            <RecentReviewsPanel
              reviews={recentReviews}
              avgRating={ratingSummary.avgRating}
              reviewCount={ratingSummary.reviewCount}
            />
          </DashSection>

          {showForecast && title === "Analytics" && forecast && (
            <RevenueForecastChartLazy forecast={forecast} />
          )}
        </>
      )}
    </div>
  );
}
