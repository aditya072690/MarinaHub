import { getNotifications, markAllNotificationsReadForActiveMarina } from "@/actions/notifications";
import { DashPageHeader } from "@/components/dashboard/dash-card";
import { NotificationsFeed } from "@/components/dashboard/notifications/notifications-feed";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const session = await getSessionContext();
  if (!session) redirect("/marina/login");

  const { items, nextCursor } = await getNotifications(
    20,
    undefined,
    session.activeMarina?.id
  );

  return (
    <div className="dash-page notif-page" data-dash-page>
      <DashPageHeader
        title="Notifications"
        description="Stay on top of bookings, fleet updates, and marina activity."
        actions={
          <form action={markAllNotificationsReadForActiveMarina}>
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        }
      />
      <NotificationsFeed
        initialItems={items}
        initialCursor={nextCursor}
        marinaId={session.activeMarina?.id}
      />
    </div>
  );
}
