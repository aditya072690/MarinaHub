import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

const REVENUE_BAR_HEIGHTS = [
  42, 68, 35, 75, 52, 80, 44, 61, 38, 72, 55, 48, 70, 33, 65, 58, 77, 41, 63, 50,
];

const TREND_BAR_HEIGHTS = [
  30, 55, 42, 68, 38, 72, 45, 60, 35, 70, 48, 58, 40, 65, 52, 75,
];

const ANALYTICS_BAR_HEIGHTS = [
  28, 45, 62, 38, 71, 52, 40, 68, 35, 58, 74, 42, 55, 33, 66, 48, 72, 39, 61, 44,
  53, 37, 69, 46, 63, 41, 57, 34, 70, 50,
];

export function KpiCardsSkeleton() {
  return (
    <div className="dash-insights-grid dash-insights-grid--stats">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="dash-skeleton-card space-y-3">
          <div className="flex items-start justify-between">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonBox className="h-8 w-8" />
          </div>
          <SkeletonLine className="h-7 w-32" />
          <SkeletonBox className="h-7 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardHeader>
        <DashCardTitle className="dash-card-title-lg">
          <SkeletonLine className="h-4 w-32" />
        </DashCardTitle>
      </DashCardHeader>
      <DashCardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonCircle size={8} />
            <SkeletonLine className="h-3 flex-1" />
            <SkeletonLine className="h-3 w-16" />
          </div>
        ))}
      </DashCardContent>
    </DashCard>
  );
}

export function RevenueForecastSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardContent className="space-y-3 p-4">
        <div className="mb-4 flex items-center justify-between">
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-6 w-20" />
        </div>
        <div className="flex h-48 items-end gap-1">
          {REVENUE_BAR_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="skeleton-shimmer flex-1 rounded-t-sm"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex gap-4">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-24" />
        </div>
      </DashCardContent>
    </DashCard>
  );
}

export function BookingTrendsSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardContent className="space-y-3 p-4">
        <SkeletonLine className="mb-4 h-4 w-36" />
        <div className="mb-4 flex gap-2">
          <SkeletonBox className="h-7 w-24 rounded-full" />
          <SkeletonBox className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex h-40 items-end gap-1">
          {TREND_BAR_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="skeleton-shimmer flex-1 rounded-t-sm"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </DashCardContent>
    </DashCard>
  );
}

export function UtilizationSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardContent className="space-y-4 p-4">
        <SkeletonLine className="mb-4 h-4 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-3 w-8" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <SkeletonBox
                className="h-full rounded-full"
                style={{ width: `${30 + i * 12}%` }}
              />
            </div>
          </div>
        ))}
      </DashCardContent>
    </DashCard>
  );
}

export function PopularBoatsSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardContent className="space-y-4 p-4">
        <SkeletonLine className="mb-4 h-4 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="h-6 w-6 rounded" />
            <div className="flex-1 space-y-1">
              <SkeletonLine className="h-3 w-36" />
              <div className="h-1.5 rounded-full bg-slate-100">
                <SkeletonBox
                  className="h-full rounded-full"
                  style={{ width: `${80 - i * 12}%` }}
                />
              </div>
            </div>
            <SkeletonLine className="h-3 w-12" />
          </div>
        ))}
      </DashCardContent>
    </DashCard>
  );
}

export function RecentReviewsSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardContent className="space-y-4 p-4">
        <SkeletonLine className="mb-2 h-4 w-32" />
        <div className="mb-4 flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-4 w-4 rounded-sm" />
            ))}
          </div>
          <SkeletonLine className="h-3 w-20" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 border-b border-slate-100 pb-4 last:border-0"
          >
            <div className="flex items-center gap-2">
              <SkeletonCircle size={32} />
              <SkeletonLine className="h-3 w-24" />
            </div>
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-3/4" />
            <SkeletonLine className="h-3 w-16" />
          </div>
        ))}
      </DashCardContent>
    </DashCard>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="dash-page space-y-8">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-36" />
        <SkeletonLine className="h-4 w-56 max-w-full" />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-24" />
        <SkeletonLine className="h-3 w-48" />
        <KpiCardsSkeleton />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-40" />
        <SkeletonLine className="h-3 w-64" />
        <div className="dash-chart-grid">
          <ActivityFeedSkeleton />
          <RevenueForecastSkeleton />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-20" />
        <SkeletonLine className="h-3 w-56" />
        <BookingTrendsSkeleton />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-36" />
        <SkeletonLine className="h-3 w-52" />
        <div className="dash-chart-grid">
          <UtilizationSkeleton />
          <PopularBoatsSkeleton />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-32" />
        <SkeletonLine className="h-3 w-48" />
        <RecentReviewsSkeleton />
      </div>
    </div>
  );
}

export function AnalyticsChartSkeleton() {
  return (
    <DashCard hover={false}>
      <DashCardContent className="space-y-3 p-4">
        <SkeletonLine className="h-4 w-40" />
        <div className="flex h-52 items-end gap-1">
          {ANALYTICS_BAR_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="skeleton-shimmer flex-1 rounded-t-sm"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </DashCardContent>
    </DashCard>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="dash-page space-y-8">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-32" />
        <SkeletonLine className="h-4 w-56 max-w-full" />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-24" />
        <KpiCardsSkeleton />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-40" />
        <div className="dash-chart-grid">
          <ActivityFeedSkeleton />
          <RevenueForecastSkeleton />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-20" />
        <BookingTrendsSkeleton />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-36" />
        <div className="dash-chart-grid">
          <UtilizationSkeleton />
          <PopularBoatsSkeleton />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-32" />
        <RecentReviewsSkeleton />
      </div>
    </div>
  );
}

export function StaffDashboardSkeleton() {
  return (
    <div className="dash-page space-y-8">
      <div className="space-y-3">
        <SkeletonLine className="h-5 w-28" />
        <SkeletonLine className="h-3 w-56" />
        <div className="dash-insights-grid dash-insights-grid--four">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dash-skeleton-card space-y-3">
              <SkeletonBox className="h-8 w-8" />
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-20" />
        <SkeletonLine className="h-3 w-40" />
        <ActivityFeedSkeleton />
      </div>
    </div>
  );
}
