import { formatCurrency } from "@/lib/currency/format";
import type { AuditLog } from "@/types/database";
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  Ban,
  CalendarCheck,
  CalendarPlus,
  CreditCard,
  Download,
  LogIn,
  LogOut,
  Pencil,
  Settings,
  Ship,
  Star,
  UserPlus,
  XCircle,
} from "lucide-react";

export type ActivityVisual = {
  icon: LucideIcon;
  iconTone: "booking" | "boat" | "customer" | "schedule" | "payment" | "system";
  category: string;
  actionLabel: string;
  detail?: string;
  href?: string;
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const ACTION_LABELS: Record<string, string> = {
  "booking.created": "New booking",
  "booking.updated": "Booking updated",
  "booking.confirmed": "Confirmed",
  "booking.pending": "Marked pending",
  "booking.checked_in": "Checked in",
  "booking.checked_out": "Checked out",
  "booking.completed": "Completed",
  "booking.cancelled": "Cancelled",
  "booking.no_show": "No show",
  "boat.added": "Boat added",
  "boat.updated": "Boat updated",
  "boat.deleted": "Boat removed",
  "block.created": "Block created",
  "block.updated": "Block updated",
  "block.deleted": "Block removed",
  "pricing_rule.created": "Pricing rule",
  "pricing_rule.updated": "Pricing rule",
  "pricing_rule.deleted": "Pricing rule",
  "customer.vip_flagged": "VIP customer",
  "marina.settings_updated": "Settings",
  "marina.contact_updated": "Contact info",
  "review.submitted": "New review",
  "export.csv": "Data export",
};

const ENTITY_CATEGORY: Record<string, string> = {
  booking: "Booking",
  boat: "Fleet",
  customer: "Customer",
  availability_block: "Schedule",
  pricing_rule: "Pricing",
  payment: "Payment",
  review: "Review",
  marina: "Marina",
};

function formatStatus(status: unknown) {
  if (typeof status !== "string") return String(status);
  return BOOKING_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function humanizeAction(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];

  const [entity, ...rest] = action.split(".");
  const verb = rest.join(" ").replace(/_/g, " ");
  if (!verb) return entity;
  return verb.replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveIcon(action: string, entityType: string): LucideIcon {
  if (action.startsWith("booking.created")) return CalendarPlus;
  if (action.startsWith("booking.checked_in")) return LogIn;
  if (action.startsWith("booking.checked_out")) return LogOut;
  if (action.startsWith("booking.cancelled")) return XCircle;
  if (action.startsWith("booking.")) return CalendarCheck;
  if (action.startsWith("boat.")) return Ship;
  if (action.startsWith("block.")) return Ban;
  if (action.startsWith("customer.")) return UserPlus;
  if (action.startsWith("payment.")) return CreditCard;
  if (action.startsWith("review.")) return Star;
  if (action.startsWith("export.")) return Download;
  if (action.includes("settings") || action.includes("contact")) return Settings;

  switch (entityType) {
    case "booking":
      return CalendarCheck;
    case "boat":
      return Ship;
    case "customer":
      return UserPlus;
    case "availability_block":
      return Ban;
    case "payment":
      return CreditCard;
    default:
      return Anchor;
  }
}

function resolveIconTone(
  action: string,
  entityType: string
): ActivityVisual["iconTone"] {
  if (entityType === "booking" || action.startsWith("booking.")) return "booking";
  if (entityType === "boat" || action.startsWith("boat.")) return "boat";
  if (entityType === "customer" || action.startsWith("customer.")) return "customer";
  if (
    entityType === "availability_block" ||
    action.startsWith("block.") ||
    action.startsWith("pricing_rule.")
  ) {
    return "schedule";
  }
  if (entityType === "payment" || action.startsWith("payment.")) return "payment";
  return "system";
}

function resolveHref(item: AuditLog): string | undefined {
  switch (item.entity_type) {
    case "booking":
      return item.entity_id ? `/dashboard/bookings/${item.entity_id}` : "/dashboard/bookings";
    case "customer":
      return item.entity_id
        ? `/dashboard/customers/${item.entity_id}`
        : "/dashboard/customers";
    case "boat":
      return "/dashboard/boats";
    case "availability_block":
      return "/dashboard/availability";
    case "payment":
      return "/dashboard/payments";
    default:
      return undefined;
  }
}

function resolveDetail(item: AuditLog): string | undefined {
  const md = item.metadata ?? {};
  const parts: string[] = [];

  if (md.from_status && md.to_status) {
    parts.push(
      `${formatStatus(md.from_status)} → ${formatStatus(md.to_status)}`
    );
  } else if (md.status && typeof md.status === "string") {
    parts.push(formatStatus(md.status));
  }

  if (md.total_price != null && md.total_price !== "") {
    parts.push(formatCurrency(Number(md.total_price)));
  }

  if (Array.isArray(md.changes) && md.changes.length > 0) {
    parts.push(`Changed: ${md.changes.join(", ")}`);
  } else if (typeof md.changes === "string" && md.changes) {
    parts.push(`Changed: ${md.changes}`);
  }

  if (md.rating != null) {
    parts.push(`${md.rating}-star rating`);
  }

  if (md.name && typeof md.name === "string") {
    parts.push(md.name);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function getActivityVisual(item: AuditLog): ActivityVisual {
  const category =
    ENTITY_CATEGORY[item.entity_type] ??
    item.entity_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    icon: resolveIcon(item.action, item.entity_type),
    iconTone: resolveIconTone(item.action, item.entity_type),
    category,
    actionLabel: humanizeAction(item.action),
    detail: resolveDetail(item),
    href: resolveHref(item),
  };
}

export function getEntityFilterLabel(value: string) {
  const labels: Record<string, string> = {
    all: "All types",
    booking: "Bookings",
    boat: "Fleet",
    customer: "Customers",
    payment: "Payments",
    availability_block: "Schedule blocks",
  };
  return labels[value] ?? value;
}

export function getDateFilterLabel(value: string) {
  const labels: Record<string, string> = {
    all: "All time",
    today: "Today",
    week: "Past 7 days",
  };
  return labels[value] ?? value;
}

export type ActivityDateGroup = {
  key: string;
  label: string;
  items: AuditLog[];
};

export function groupActivityByDate(
  items: AuditLog[],
  now = new Date()
): ActivityDateGroup[] {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const buckets = new Map<string, ActivityDateGroup>();

  for (const item of items) {
    const created = new Date(item.created_at);
    let key: string;
    let label: string;

    if (created >= todayStart) {
      key = "today";
      label = "Today";
    } else if (created >= yesterdayStart) {
      key = "yesterday";
      label = "Yesterday";
    } else if (created >= weekStart) {
      key = "this-week";
      label = "Earlier this week";
    } else {
      key = "earlier";
      label = "Earlier";
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      buckets.set(key, { key, label, items: [item] });
    }
  }

  const order = ["today", "yesterday", "this-week", "earlier"];
  return order
    .map((key) => buckets.get(key))
    .filter((group): group is ActivityDateGroup => Boolean(group));
}
