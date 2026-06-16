import { getWaitlistEntries } from "@/actions/waitlist";
import { DashPageHeader } from "@/components/dashboard/dash-card";
import { WaitlistTable } from "@/components/dashboard/waitlist-table";
import { getSessionContext } from "@/lib/auth/session";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { redirect } from "next/navigation";

export default async function WaitlistPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole === "staff") redirect("/dashboard");

  const entries = await getWaitlistEntries(session.activeMarina.id);
  const timezone = session.activeMarina.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="dash-page" data-dash-page>
      <DashPageHeader
        title="Waitlist"
        description={session.activeMarina.name}
      />
      <p className="text-sm text-[#4A6580]" data-dash-animate>
        Guests are notified in-app when a matching slot opens (booking cancelled
        or block removed). Guest email notifications are not sent in this demo.
      </p>
      <WaitlistTable
        marinaId={session.activeMarina.id}
        entries={entries}
        timezone={timezone}
      />
    </div>
  );
}
