import { getNotificationsBell } from "@/actions/notifications";
import { getOnboardingState } from "@/actions/onboarding";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RealtimeProvider } from "@/components/shared/realtime-provider";
import { canManageOnboarding } from "@/lib/auth/permissions";
import { getAuthIntent } from "@/lib/auth/intent";
import { getSessionContext } from "@/lib/auth/session";
import { MarinaProvider } from "@/providers/marina-provider";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/auth/login?intent=marina");
  }

  if (session.memberships.length === 0) {
    const intent = await getAuthIntent();
    redirect(intent === "consumer" ? "/account" : "/onboarding");
  }

  const marinaId = session.activeMarina?.id;

  const activeMembership =
    session.memberships.find((m) => m.marina_id === marinaId) ??
    session.memberships[0];

  if (!activeMembership) {
    const intent = await getAuthIntent();
    redirect(intent === "consumer" ? "/account" : "/onboarding");
  }

  const activeMarinaId = activeMembership.marina_id;

  if (canManageOnboarding(activeMembership.role)) {
    const supabase = await createClient();
    const [onboarding, customerCountRes, notificationsBell] = await Promise.all([
      getOnboardingState(activeMarinaId),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.userId),
      getNotificationsBell(activeMarinaId, 10),
    ]);

    if (onboarding && !onboarding.is_complete) {
      redirect("/onboarding");
    }

    const showConsumerSwitch = (customerCountRes.count ?? 0) > 0;

    return (
      <MarinaProvider
        value={{
          marina: activeMembership.marinas,
          role: activeMembership.role,
          memberships: session.memberships,
          userId: session.userId,
        }}
      >
        <RealtimeProvider marinaId={activeMarinaId}>
          <DashboardShell
            showConsumerSwitch={showConsumerSwitch}
            initialNotifications={notificationsBell}
          >
            {children}
          </DashboardShell>
        </RealtimeProvider>
      </MarinaProvider>
    );
  }

  const supabase = await createClient();
  const [{ count: customerCount }, notificationsBell] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
    getNotificationsBell(activeMarinaId, 10),
  ]);

  const showConsumerSwitch = (customerCount ?? 0) > 0;

  return (
    <MarinaProvider
      value={{
        marina: activeMembership.marinas,
        role: activeMembership.role,
        memberships: session.memberships,
        userId: session.userId,
      }}
    >
      <RealtimeProvider marinaId={activeMarinaId}>
        <DashboardShell
          showConsumerSwitch={showConsumerSwitch}
          initialNotifications={notificationsBell}
        >
          {children}
        </DashboardShell>
      </RealtimeProvider>
    </MarinaProvider>
  );
}
