import {
  DashCard,
  DashCardContent,
} from "@/components/dashboard/dash-card";
import { DashPageLoadingShell } from "./loading-shell";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonButton,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function FleetGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <SkeletonBox className="h-9 w-full sm:w-64" />
        <SkeletonButton className="w-full sm:w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <SkeletonBox className="h-44 w-full" style={{ borderRadius: 0 }} />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonBadge />
              </div>
              <SkeletonLine className="h-3 w-20" />
              <div className="flex gap-2">
                <SkeletonBox className="h-6 w-16 rounded-full" />
                <SkeletonBox className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FleetTableSkeleton() {
  return (
    <DashPageLoadingShell titleWidth="w-24" showActions>
      <div className="dash-insights-grid dash-insights-grid--four">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-skeleton-card space-y-3">
            <SkeletonBox className="h-8 w-8" />
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-7 w-16" />
          </div>
        ))}
      </div>

      <DashCard hover={false}>
        <DashCardContent className="space-y-4 p-4">
          <div className="fleet-toolbar">
            <SkeletonBox className="fleet-toolbar-search h-10 w-full" />
            <SkeletonBox className="fleet-toolbar-select h-10 w-full sm:w-36" />
            <SkeletonBox className="fleet-toolbar-select h-10 w-full sm:w-36" />
            <SkeletonBox className="fleet-toolbar-select h-10 w-full sm:w-36" />
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-6 gap-4 border-b border-slate-100 px-2 py-2">
              {["w-20", "w-16", "w-20", "w-16", "w-16", "w-16"].map((w, i) => (
                <SkeletonLine key={i} className={`h-3 ${w}`} />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-6 items-center gap-4 border-b border-slate-50 px-2 py-3"
              >
                <div className="flex items-center gap-3">
                  <SkeletonBox className="h-11 w-11 shrink-0 rounded-lg" />
                  <div className="space-y-1">
                    <SkeletonLine className="h-3 w-28" />
                    <SkeletonLine className="h-3 w-20" />
                  </div>
                </div>
                <SkeletonLine className="h-3 w-16" />
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-3 w-16" />
                <SkeletonBadge />
                <div className="flex justify-end gap-2">
                  <SkeletonBox className="h-9 w-9" />
                  <SkeletonBox className="h-9 w-9" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <SkeletonBox className="h-16 w-16 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="h-4 w-32" />
                    <SkeletonBadge />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-3 w-16" />
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </DashCardContent>
      </DashCard>
    </DashPageLoadingShell>
  );
}
