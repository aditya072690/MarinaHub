import { getActivityFeed } from "@/actions/audit-logs";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashPageHeader } from "@/components/dashboard/dash-card";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ActivityPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const marinaId = session.activeMarina.id;
  const initialActivityFeed = await getActivityFeed(marinaId, 50);

  return (
    <div className="dash-page w-full min-w-0" data-dash-page>
      <DashPageHeader
        title="Activity Feed"
        description={`Live operational timeline for ${session.activeMarina.name}`}
      />
      <ActivityFeed
        marinaId={marinaId}
        limit={50}
        showFilters
        initialItems={initialActivityFeed}
      />
    </div>
  );
}
