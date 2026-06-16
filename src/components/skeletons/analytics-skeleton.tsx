import {
  AnalyticsChartSkeleton,
  KpiCardsSkeleton,
  PopularBoatsSkeleton,
  UtilizationSkeleton,
} from "./dashboard-skeleton";
import {
  SkeletonLine,
} from "./primitives";

export function AnalyticsSkeleton() {
  return (
    <div className="dash-page space-y-8">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-28" />
        <SkeletonLine className="h-4 w-56 max-w-full" />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-24" />
        <KpiCardsSkeleton />
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-5 w-20" />
        <AnalyticsChartSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <UtilizationSkeleton />
        <PopularBoatsSkeleton />
      </div>
    </div>
  );
}
