import type { Notification, NotificationType } from "@/types/database";

export type NotificationCategory =
  | "all"
  | "bookings"
  | "payments"
  | "fleet"
  | "system";

export type NotificationReadFilter = "all" | "read" | "unread";
export type NotificationPriorityFilter = "all" | "priority" | "normal";

const BOOKING_TYPES: NotificationType[] = [
  "new_booking",
  "booking_cancelled",
  "booking_confirmed",
  "booking_checked_in",
  "booking_checked_out",
  "booking_reminder_ui_only",
  "waitlist_available",
];

const FLEET_TYPES: NotificationType[] = ["boat_unavailable"];

export function getNotificationCategory(
  type: NotificationType
): Exclude<NotificationCategory, "all"> {
  if (BOOKING_TYPES.includes(type)) return "bookings";
  if (FLEET_TYPES.includes(type)) return "fleet";
  if (type.includes("payment")) return "payments";
  return "system";
}

export function getNotificationCategoryLabel(
  category: Exclude<NotificationCategory, "all">
): string {
  switch (category) {
    case "bookings":
      return "Bookings";
    case "payments":
      return "Payments";
    case "fleet":
      return "Fleet";
    case "system":
      return "System";
  }
}

export function isPriorityNotification(notification: Notification): boolean {
  if (!notification.read_at) return true;
  const meta = notification.metadata as { priority?: string } | undefined;
  return meta?.priority === "high";
}

export function getNotificationQuickAction(
  notification: Notification
): { label: string; href: string } | null {
  if (!notification.entity_type || !notification.entity_id) return null;

  if (notification.entity_type === "booking") {
    return {
      label: "View booking",
      href: `/dashboard/bookings/${notification.entity_id}`,
    };
  }

  if (notification.entity_type === "boat") {
    return {
      label: "View fleet",
      href: "/dashboard/boats",
    };
  }

  return null;
}

export function filterNotifications(
  items: Notification[],
  options: {
    category: NotificationCategory;
    readFilter: NotificationReadFilter;
    priorityFilter: NotificationPriorityFilter;
    search: string;
  }
): Notification[] {
  const query = options.search.trim().toLowerCase();

  return items.filter((item) => {
    if (options.category !== "all") {
      if (getNotificationCategory(item.type) !== options.category) return false;
    }

    if (options.readFilter === "read" && !item.read_at) return false;
    if (options.readFilter === "unread" && item.read_at) return false;

    const priority = isPriorityNotification(item);
    if (options.priorityFilter === "priority" && !priority) return false;
    if (options.priorityFilter === "normal" && priority) return false;

    if (!query) return true;

    const haystack = `${item.title} ${item.body ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });
}
