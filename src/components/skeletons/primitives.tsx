import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer h-3 rounded", className)} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton-shimmer flex-shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonBox({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("skeleton-shimmer rounded-lg", className)} style={style} />
  );
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer h-5 w-16 rounded-full", className)} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer h-9 rounded-md", className)} />;
}
