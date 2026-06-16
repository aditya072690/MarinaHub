import { getBoats } from "@/actions/boats";
import { FleetTable } from "@/components/dashboard/fleet-table";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const revalidate = 30;

export default async function BoatsPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  if (session.activeRole === "staff") {
    redirect("/dashboard");
  }

  const boats = await getBoats(session.activeMarina.id);

  return <FleetTable boats={boats} />;
}
