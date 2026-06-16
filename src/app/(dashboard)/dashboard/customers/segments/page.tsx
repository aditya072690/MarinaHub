import { formatCurrency } from "@/lib/currency/format";
import {
  getCustomerSegments,
  getSegmentSummaryFromSegments,
  refreshCustomerSegments,
} from "@/actions/customer-segments";
import { DashPageHeader } from "@/components/dashboard/dash-card";
import { SegmentsDashboardView } from "@/components/dashboard/segments-dashboard-view";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function CustomerSegmentsPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole === "staff") redirect("/dashboard");

  const marinaId = session.activeMarina.id;
  await refreshCustomerSegments(marinaId);
  const segments = await getCustomerSegments(marinaId, undefined, {
    skipRefresh: true,
  });
  const summary = await getSegmentSummaryFromSegments(segments);

  return (
    <div className="dash-page" data-dash-page>
      <DashPageHeader
        title="Customer Segments"
        description={session.activeMarina.name}
      />
      <SegmentsDashboardView segments={segments} summary={summary} />
    </div>
  );
}
