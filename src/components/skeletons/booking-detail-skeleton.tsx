import { SimplePageHeaderSkeleton } from "./loading-shell";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonButton,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function BookingDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton className="w-28" />
          <SkeletonButton className="w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-4 w-28" />
              <SkeletonBadge />
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between py-1">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-3 w-28" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <SkeletonLine className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <SkeletonCircle size={48} />
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <SkeletonLine className="h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-between border-b border-slate-50 py-2 last:border-0"
          >
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingDetailLoading() {
  return (
    <div className="space-y-6">
      <SimplePageHeaderSkeleton titleWidth="w-48" />
      <BookingDetailSkeleton />
    </div>
  );
}
