import { NotificationBell } from "@/components/dashboard/notifications/notification-bell";
import type { NotificationsBellData } from "@/lib/data/notifications-bell";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/database";

const EMPTY_NOTIFICATIONS: NotificationsBellData = { list: [], unreadCount: 0 };

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export function DashboardHeader({
  title,
  subtitle,
  userId,
  role,
  initialNotifications = EMPTY_NOTIFICATIONS,
}: {
  title: string;
  subtitle?: string;
  userId: string;
  role: UserRole;
  initialNotifications?: NotificationsBellData;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Badge variant="outline">{ROLE_LABELS[role]}</Badge>
        </div>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      <NotificationBell userId={userId} initialData={initialNotifications} />
    </div>
  );
}
