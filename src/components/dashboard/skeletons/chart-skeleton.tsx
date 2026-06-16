import {
  DashCard,
  DashCardContent,
} from "@/components/dashboard/dash-card";
import {
  SkeletonBox,
  SkeletonLine,
} from "@/components/skeletons/primitives";

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <DashCard hover={false}>
      <DashCardContent className="dash-card-content--chart space-y-3">
        <SkeletonBox className="h-9 w-52" />
        <SkeletonBox className="w-full rounded-lg" style={{ height }} />
      </DashCardContent>
    </DashCard>
  );
}
