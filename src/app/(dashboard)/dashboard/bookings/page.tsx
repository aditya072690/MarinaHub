import { getSessionContext } from "@/lib/auth/session";
import { canExportData } from "@/lib/export/auth";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import type { BookingStatus } from "@/types/database";
import { redirect } from "next/navigation";
import { BookingsPageClient } from "@/components/dashboard/bookings-page-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as BookingStatus)
      : undefined;

  const canExport = canExportData(session.activeRole, "bookings");

  return (
    <BookingsPageClient
      marinaId={session.activeMarina.id}
      role={session.activeRole!}
      timezone={session.activeMarina.timezone ?? DEFAULT_TIMEZONE}
      status={status}
      search={params.search}
      cursor={params.cursor}
      canExport={canExport}
    />
  );
}
