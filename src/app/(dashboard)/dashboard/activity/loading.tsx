import { ActivityFeedSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { DashPageLoadingShell } from "@/components/skeletons/loading-shell";

export default function ActivityLoading() {
  return (
    <DashPageLoadingShell titleWidth="w-28">
      <ActivityFeedSkeleton />
    </DashPageLoadingShell>
  );
}
