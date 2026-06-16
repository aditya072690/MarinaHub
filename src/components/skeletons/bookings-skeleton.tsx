import { DashCard, DashCardContent } from "@/components/dashboard/dash-card";
import { DashPageLoadingShell } from "./loading-shell";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function BookingsTableSkeleton() {
  return (
    <DashPageLoadingShell titleWidth="w-28" showActions>
      <div className="dash-data-panel space-y-4">
        <div className="dash-data-toolbar-stack">
          <SkeletonBox className="fleet-toolbar-search h-10 w-full sm:max-w-xs" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>

        <DashCard hover={false}>
          <DashCardContent className="overflow-hidden p-0 sm:p-0">
            <div className="hidden md:block">
              <div className="grid grid-cols-7 gap-4 bg-slate-50 px-4 py-2">
                {["w-16", "w-24", "w-20", "w-16", "w-14", "w-20", "w-12"].map(
                  (w, i) => (
                    <SkeletonLine key={i} className={`h-3 ${w}`} />
                  )
                )}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-7 items-center gap-4 border-t border-slate-50 px-4 py-3"
                >
                  <div className="space-y-1">
                    <SkeletonLine className="h-3 w-24" />
                    <SkeletonLine className="h-3 w-32" />
                  </div>
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-3 w-10" />
                  <SkeletonBadge />
                  <SkeletonLine className="h-3 w-16" />
                  <SkeletonBox className="h-8 w-32" />
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 p-4">
                  <div className="flex justify-between">
                    <SkeletonLine className="h-3 w-20" />
                    <SkeletonBadge />
                  </div>
                  <SkeletonLine className="h-3 w-32" />
                  <SkeletonLine className="h-3 w-24" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 p-4">
              <SkeletonLine className="h-3 w-32" />
              <SkeletonBox className="h-9 w-28" />
            </div>
          </DashCardContent>
        </DashCard>
      </div>
    </DashPageLoadingShell>
  );
}
