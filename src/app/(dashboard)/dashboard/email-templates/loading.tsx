import { FleetGridSkeleton } from "@/components/skeletons/fleet-skeleton";
import { DashPageLoadingShell } from "@/components/skeletons/loading-shell";

export default function EmailTemplatesLoading() {
  return (
    <DashPageLoadingShell titleWidth="w-40">
      <FleetGridSkeleton />
    </DashPageLoadingShell>
  );
}
