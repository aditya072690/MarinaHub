import { DashPageLoadingShell } from "./loading-shell";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonButton,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function WaitlistSkeleton() {
  return (
    <DashPageLoadingShell titleWidth="w-24">
      <SkeletonLine className="h-4 w-full max-w-2xl" />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex justify-between border-b border-slate-100 p-4">
          <SkeletonLine className="h-4 w-24" />
          <SkeletonBox className="h-8 w-28" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 border-b border-slate-50 px-4 py-3 sm:flex-row sm:items-center"
          >
            <SkeletonCircle size={36} />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-3 w-32" />
              <SkeletonLine className="h-3 w-48" />
            </div>
            <SkeletonBadge />
            <SkeletonButton className="w-full sm:w-24" />
          </div>
        ))}
      </div>
    </DashPageLoadingShell>
  );
}
