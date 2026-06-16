import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import {
  SkeletonCircle,
  SkeletonLine,
} from "@/components/skeletons/primitives";

export function ActivitySkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <DashCard hover={false}>
      <DashCardHeader>
        <DashCardTitle className="dash-card-title-lg">
          <SkeletonLine className="h-4 w-32" />
        </DashCardTitle>
      </DashCardHeader>
      <DashCardContent className="space-y-3">
        {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <SkeletonCircle size={16} />
            <div className="flex-1 space-y-1">
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-24" />
            </div>
          </div>
        ))}
      </DashCardContent>
    </DashCard>
  );
}
