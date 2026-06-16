import { getMaintenanceLogs } from "@/actions/maintenance";
import { getBoats } from "@/actions/boats";
import {
  MaintenanceLogForm,
  MaintenanceLogTable,
} from "@/components/dashboard/maintenance-log-table";
import { getSessionContext } from "@/lib/auth/session";
import { canManageBlocks } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function MaintenancePage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole === "staff") redirect("/dashboard");

  const marinaId = session.activeMarina.id;
  const [logs, boats] = await Promise.all([
    getMaintenanceLogs(marinaId),
    getBoats(marinaId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Logs</h1>
          <p className="text-muted-foreground">
            Track boat maintenance and service history
          </p>
        </div>
        {canManageBlocks(session.activeRole) && (
          <MaintenanceLogForm marinaId={marinaId} boats={boats} />
        )}
      </div>
      <MaintenanceLogTable
        logs={logs}
        marinaId={marinaId}
        canEdit={canManageBlocks(session.activeRole)}
      />
    </div>
  );
}
