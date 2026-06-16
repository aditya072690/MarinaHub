import { getAvailabilityBlocks } from "@/actions/availability";
import { AvailabilityBlocksManager } from "@/components/dashboard/availability-blocks";
import { getBoats } from "@/actions/boats";
import { getSessionContext } from "@/lib/auth/session";
import { canManageBlocks } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AvailabilityPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const marinaId = session.activeMarina.id;
  const [blocks, boats] = await Promise.all([
    getAvailabilityBlocks(marinaId),
    getBoats(marinaId),
  ]);

  return (
    <AvailabilityBlocksManager
      blocks={blocks}
      boats={boats}
      marinaId={marinaId}
      timezone={session.activeMarina.timezone}
      canManage={canManageBlocks(session.activeRole)}
    />
  );
}
