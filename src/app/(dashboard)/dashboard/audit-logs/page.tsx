import { getAuditLogs } from "@/actions/audit-logs";
import { AuditLogTable } from "@/components/dashboard/audit-log-table";
import { DashPageHeader } from "@/components/dashboard/dash-card";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AuditLogsPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole !== "owner") redirect("/dashboard");

  const logs = await getAuditLogs(session.activeMarina.id);

  return (
    <div className="dash-page audit-page" data-dash-page>
      <DashPageHeader
        title="Audit Logs"
        description={`Complete history of actions at ${session.activeMarina.name}`}
      />
      <AuditLogTable logs={logs} />
    </div>
  );
}
