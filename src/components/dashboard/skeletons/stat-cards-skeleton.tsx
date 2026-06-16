import {
  SkeletonBox,
  SkeletonLine,
} from "@/components/skeletons/primitives";

export function StatCardsSkeleton() {
  return (
    <div className="dash-insights-grid dash-insights-grid--stats">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="dash-skeleton-card space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-8 w-8" />
            <SkeletonBox className="h-5 w-12 rounded-full" />
          </div>
          <SkeletonLine className="w-24" />
          <SkeletonLine className="h-7 w-20" />
          <SkeletonBox className="h-7 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
