import { SimplePageHeaderSkeleton } from "./loading-shell";
import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function AuditLogsSkeleton() {
  return (
    <div className="dash-page audit-page space-y-6">
      <SimplePageHeaderSkeleton titleWidth="w-32" />

      <div className="audit-insights">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SkeletonBox className="h-10 flex-1" />
          <SkeletonBox className="h-10 w-36" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 border-b border-slate-50 py-3"
          >
            <SkeletonCircle size={8} />
            <div className="flex-1 space-y-1.5">
              <SkeletonLine className="h-3 w-3/4" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
            <SkeletonLine className="h-3 w-20 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
