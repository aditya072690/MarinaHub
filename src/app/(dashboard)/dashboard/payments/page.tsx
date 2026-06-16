import { PaymentsDashboard } from "@/components/dashboard/payments-dashboard";
import { ConnectRefreshHandler } from "@/components/dashboard/connect-refresh-handler";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function PaymentsPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole !== "owner") redirect("/dashboard");

  return (
    <>
      <ConnectRefreshHandler />
      <PaymentsDashboard
        marinaId={session.activeMarina.id}
        marinaName={session.activeMarina.name}
      />
    </>
  );
}
