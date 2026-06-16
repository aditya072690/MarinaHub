import { DashCard, DashCardContent } from "@/components/dashboard/dash-card";
import { DashPageLoadingShell } from "./loading-shell";
import { SkeletonBox, SkeletonLine } from "./primitives";

export function CalendarSkeleton() {
  return (
    <DashPageLoadingShell titleWidth="w-44" showActions>
      <DashCard hover={false} className="overflow-hidden">
        <DashCardContent className="overflow-hidden p-0 sm:p-0">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <SkeletonBox className="h-8 w-8" />
              <SkeletonLine className="h-5 w-32" />
              <SkeletonBox className="h-8 w-8" />
            </div>
            <div className="flex gap-2">
              <SkeletonBox className="h-8 w-20" />
              <SkeletonBox className="h-8 w-20" />
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-2 text-center">
                <SkeletonLine className="mx-auto h-3 w-6" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[80px] space-y-1 border-r border-b border-slate-50 p-2 sm:min-h-[100px]"
              >
                <SkeletonLine className="h-3 w-4" />
                {i % 4 === 0 ? (
                  <SkeletonBox className="h-5 w-full rounded" />
                ) : null}
                {i % 7 === 2 ? (
                  <SkeletonBox className="h-5 w-full rounded" />
                ) : null}
              </div>
            ))}
          </div>
        </DashCardContent>
      </DashCard>
    </DashPageLoadingShell>
  );
}
