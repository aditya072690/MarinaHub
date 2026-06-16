import { SimplePageHeaderSkeleton } from "./loading-shell";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function PaymentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SimplePageHeaderSkeleton titleWidth="w-32" />
        <SkeletonBox className="h-9 w-36" />
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <SkeletonLine className="h-4 w-40" />
        <div className="flex items-center gap-3">
          <SkeletonCircle size={40} />
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-3 w-28" />
          </div>
        </div>
        <SkeletonBox className="h-10 w-40" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-4"
          >
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-6 w-28" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <SkeletonLine className="h-4 w-36" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-50 px-4 py-3"
          >
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 flex-1" />
            <SkeletonBadge />
            <SkeletonLine className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
