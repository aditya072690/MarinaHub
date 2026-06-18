import { getSessionContext } from "@/lib/auth/session";
import { canExportData } from "@/lib/export/auth";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import type { CustomerSegment } from "@/types/database";
import { redirect } from "next/navigation";
import { CustomersPageClient } from "@/components/dashboard/customers-page-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    segment?: string;
    cursor?: string;
    search?: string;
  }>;
}) {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const marinaId = session.activeMarina.id;
  const params = await searchParams;
  const segmentFilter = params.segment as CustomerSegment | undefined;
  
  const timezone = session.activeMarina.timezone ?? DEFAULT_TIMEZONE;
  const canExport = canExportData(session.activeRole, "customers");

  return (
    <CustomersPageClient
      marinaId={marinaId}
      timezone={timezone}
      segmentFilter={segmentFilter}
      search={params.search}
      cursor={params.cursor}
      canExport={canExport}
    />
  );
}
