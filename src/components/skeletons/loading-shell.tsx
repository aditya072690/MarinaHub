import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  SkeletonBadge,
  SkeletonBox,
  SkeletonButton,
  SkeletonCircle,
  SkeletonLine,
} from "./primitives";

export function DashPageHeaderSkeleton({
  titleWidth = "w-32",
  showActions = false,
}: {
  titleWidth?: string;
  showActions?: boolean;
}) {
  return (
    <div className="dash-page-header-row">
      <div className="dash-page-header space-y-2">
        <SkeletonLine className={cn("h-7", titleWidth)} />
        <SkeletonLine className="h-4 w-64 max-w-full" />
      </div>
      {showActions ? (
        <div className="dash-page-actions">
          <SkeletonButton className="w-36" />
        </div>
      ) : null}
    </div>
  );
}

export function DashPageLoadingShell({
  titleWidth = "w-32",
  showActions = false,
  children,
}: {
  titleWidth?: string;
  showActions?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="dash-page space-y-6">
      <DashPageHeaderSkeleton titleWidth={titleWidth} showActions={showActions} />
      {children}
    </div>
  );
}

export function SimplePageHeaderSkeleton({
  titleWidth = "w-40",
}: {
  titleWidth?: string;
}) {
  return (
    <div className="space-y-2">
      <SkeletonLine className={cn("h-8", titleWidth)} />
      <SkeletonLine className="h-4 w-64 max-w-full" />
    </div>
  );
}

export function AccountPageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonLine className="h-8 w-40" />
      <SkeletonLine className="h-4 w-56 max-w-full" />
    </div>
  );
}
