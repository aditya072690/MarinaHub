import { WidgetSkeleton } from "@/components/skeletons/consumer-skeleton";
import { DashPageLoadingShell } from "@/components/skeletons/loading-shell";

export default function WidgetSettingsLoading() {
  return (
    <DashPageLoadingShell titleWidth="w-28">
      <WidgetSkeleton />
    </DashPageLoadingShell>
  );
}
