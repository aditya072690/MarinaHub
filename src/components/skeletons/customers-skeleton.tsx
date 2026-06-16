import { DashCard, DashCardContent } from "@/components/dashboard/dash-card";
import { DashPageLoadingShell } from "./loading-shell";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function CustomersTableSkeleton() {
  return (
    <DashPageLoadingShell titleWidth="w-32" showActions>
      <div className="dash-data-panel space-y-4">
        <div className="dash-data-toolbar-stack">
          <SkeletonBox className="fleet-toolbar-search h-10 w-full sm:max-w-xs" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>

        <DashCard hover={false}>
          <DashCardContent className="overflow-hidden p-0 sm:p-0">
            <div className="hidden md:block">
              <div className="grid grid-cols-7 gap-4 bg-slate-50 px-4 py-2">
                {["w-24", "w-20", "w-32", "w-20", "w-16", "w-20", "w-24"].map(
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
                  <SkeletonLine className="h-3 w-28" />
                  <SkeletonBadge />
                  <SkeletonLine className="h-3 w-36" />
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-3 w-10" />
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-3 w-24" />
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <SkeletonCircle size={40} />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="h-3 w-28" />
                    <SkeletonLine className="h-3 w-36" />
                  </div>
                  <SkeletonBadge />
                </div>
              ))}
            </div>
          </DashCardContent>
        </DashCard>
      </div>
    </DashPageLoadingShell>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="h-8 w-48" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-6 w-24" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <SkeletonLine className="mb-4 h-4 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-5 items-center gap-4 border-t border-slate-50 px-2 py-3"
          >
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-24" />
            <SkeletonBadge />
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
