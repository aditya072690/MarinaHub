import {
  canManageSettings,
  canManageWidget,
  canViewAnalytics,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Ship,
  Users,
  Code,
  Clock,
  PieChart,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

function matchesNavPath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/dashboard/analytics") {
    return pathname === "/dashboard/analytics";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Picks the most specific nav href for the current path (longest prefix match). */
export function resolveActiveNavHref(
  pathname: string,
  hrefs: string[]
): string | null {
  let best: string | null = null;

  for (const href of hrefs) {
    if (!matchesNavPath(pathname, href)) continue;
    if (!best || href.length > best.length) {
      best = href;
    }
  }

  return best;
}

export function isNavActive(
  pathname: string,
  href: string,
  allHrefs?: string[]
): boolean {
  if (allHrefs && allHrefs.length > 0) {
    return resolveActiveNavHref(pathname, allHrefs) === href;
  }
  return matchesNavPath(pathname, href);
}

export function getNavItems(role: UserRole | null): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  if (role !== "staff") {
    items.push({ href: "/dashboard/boats", label: "Fleet", icon: Ship });
  }

  items.push(
    { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/activity", label: "Activity", icon: Activity }
  );

  if (role !== "staff") {
    items.push({ href: "/dashboard/waitlist", label: "Waitlist", icon: Clock });
    items.push({
      href: "/dashboard/customers/segments",
      label: "Segments",
      icon: PieChart,
    });
  }

  if (canViewAnalytics(role)) {
    items.push({
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: BarChart3,
    });
  }

  if (canManageSettings(role)) {
    items.push({
      href: "/dashboard/payments",
      label: "Payments",
      icon: CreditCard,
    });
    items.push({
      href: "/dashboard/audit-logs",
      label: "Audit Logs",
      icon: FileText,
    });
  }

  if (canManageWidget(role)) {
    items.push({
      href: "/dashboard/widget",
      label: "Widget Settings",
      icon: Code,
    });
  }

  items.push({
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
  });

  if (canManageSettings(role)) {
    items.push({
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    });
  }

  return items;
}
