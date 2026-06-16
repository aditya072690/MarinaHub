import { SimplePageHeaderSkeleton } from "./loading-shell";
import {
  SkeletonBox,
  SkeletonButton,
  SkeletonLine,
} from "./primitives";

export function SettingsSkeleton() {
  return (
    <div className="dash-page dash-settings-page space-y-6">
      <SimplePageHeaderSkeleton titleWidth="w-44" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>

      <div className="dash-settings-stack">
        {Array.from({ length: 2 }).map((_, section) => (
          <div
            key={section}
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"
          >
            <SkeletonLine className="h-4 w-40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonBox className="h-9 w-full" />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <SkeletonButton className="w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
