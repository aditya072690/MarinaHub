import { MarinaStorefrontSkeleton } from "@/components/skeletons/consumer-skeleton";
import {
  SkeletonBox,
  SkeletonLine,
} from "@/components/skeletons/primitives";

export function BookingConfirmationSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <SkeletonBox className="mx-auto h-16 w-16 rounded-full" />
        <SkeletonLine className="mx-auto h-7 w-48" />
        <SkeletonLine className="mx-auto h-4 w-64" />
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-32" />
          </div>
        ))}
      </div>
      <SkeletonBox className="h-11 w-full" />
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <SkeletonLine className="h-8 w-48" />
      <div className="grid gap-8 lg:grid-cols-4">
        <SkeletonBox className="h-64 rounded-xl lg:col-span-1" />
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketingHomeSkeleton() {
  return (
    <div className="min-h-screen space-y-8 bg-white p-4">
      <SkeletonBox className="h-16 w-full rounded-xl" />
      <SkeletonBox className="h-96 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
