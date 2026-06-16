import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkeletonChart({
  height = 300,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <Skeleton className="mb-4 h-6 w-40" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}
