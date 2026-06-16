import { KpiCardsSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { DashPageLoadingShell } from "@/components/skeletons/loading-shell";
import { SkeletonLine } from "@/components/skeletons/primitives";

export default function CustomerSegmentsLoading() {
  return (
    <DashPageLoadingShell titleWidth="w-40">
      <SkeletonLine className="h-4 w-64" />
      <KpiCardsSkeleton />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 items-center gap-4 border-b border-slate-50 px-4 py-3"
          >
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        ))}
      </div>
    </DashPageLoadingShell>
  );
}
