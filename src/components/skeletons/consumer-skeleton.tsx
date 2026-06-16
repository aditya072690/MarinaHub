import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonButton,
  SkeletonLine,
} from "./primitives";

export function MarinaStorefrontSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <SkeletonBox className="h-56 w-full rounded-xl sm:h-72" />
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-48" />
        <SkeletonLine className="h-4 w-64" />
        <div className="mt-2 flex gap-2">
          <SkeletonBadge />
          <SkeletonBadge />
          <SkeletonBadge />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <SkeletonBox className="h-40 w-full" style={{ borderRadius: 0 }} />
            <div className="space-y-2 p-4">
              <SkeletonLine className="h-4 w-36" />
              <SkeletonLine className="h-3 w-20" />
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <SkeletonLine className="h-3 w-16" />
                <SkeletonButton className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoatDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SkeletonBox className="h-64 w-full rounded-xl sm:h-80" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SkeletonLine className="h-7 w-48" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBadge key={i} />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLine key={i} className="h-3 w-full" />
          ))}
          <SkeletonLine className="h-3 w-3/4" />
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <SkeletonLine className="h-4 w-24" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonLine className="h-5 w-32" />
          <SkeletonButton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

export function MyTripsSkeleton() {
  return (
    <div className="account-page space-y-4">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-32" />
        <SkeletonLine className="h-4 w-48" />
      </div>

      <div className="flex gap-2">
        <SkeletonBox className="h-8 w-20 rounded-full" />
        <SkeletonBox className="h-8 w-20 rounded-full" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <SkeletonLine className="h-4 w-40" />
            <SkeletonBadge />
          </div>
          <SkeletonLine className="h-3 w-56" />
          <div className="flex flex-col justify-between gap-2 border-t border-slate-100 pt-2 sm:flex-row">
            <SkeletonLine className="h-3 w-28" />
            <SkeletonButton className="h-8 w-full sm:w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <SkeletonLine className="mx-auto h-5 w-32" />
      <SkeletonBox className="h-10 w-full" />
      <SkeletonBox className="h-10 w-full" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <SkeletonLine className="h-4 w-24" />
      <SkeletonButton className="h-11 w-full" />
    </div>
  );
}

export function AccountSettingsSkeleton() {
  return (
    <div className="account-page space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-40" />
        <SkeletonLine className="h-4 w-56 max-w-full" />
      </div>
      <div className="account-card space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonBox className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <SkeletonBox className="h-11 w-36 rounded-lg" />
      </div>
    </div>
  );
}

export function FavoritesSkeleton() {
  return (
    <div className="account-page space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-36" />
        <SkeletonLine className="h-4 w-52" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <SkeletonBox className="h-40 w-full" style={{ borderRadius: 0 }} />
            <div className="space-y-2 p-4">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericFormSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-64" />
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonBox className="h-10 w-full" />
          </div>
        ))}
        <SkeletonBox className="h-10 w-32" />
      </div>
    </div>
  );
}

export function GenericTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-40" />
        <SkeletonLine className="h-4 w-64" />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <SkeletonBox className="h-9 w-full max-w-xs" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-50 px-4 py-3"
          >
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-3 flex-1" />
            <SkeletonLine className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
