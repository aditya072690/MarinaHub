"use client";

import { cn } from "@/lib/utils";
import {
  ClipboardList,
  MapPin,
  Settings2,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/dashboard/settings",
    label: "General",
    icon: Settings2,
    match: (path: string) => path === "/dashboard/settings",
  },
  {
    href: "/dashboard/team",
    label: "Team",
    icon: Users,
    match: (path: string) => path.startsWith("/dashboard/team"),
  },
  {
    href: "/dashboard/maintenance",
    label: "Maintenance",
    icon: Wrench,
    match: (path: string) => path.startsWith("/dashboard/maintenance"),
  },
  {
    href: "/dashboard/audit-logs",
    label: "Audit",
    icon: ClipboardList,
    match: (path: string) => path.startsWith("/dashboard/audit-logs"),
  },
] as const;

export function SettingsNavTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="dash-settings-tabs"
      aria-label="Settings sections"
      data-dash-animate
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "dash-settings-tab",
              active && "dash-settings-tab--active"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <span className="dash-settings-tab-spacer" aria-hidden>
        <MapPin className="h-4 w-4 opacity-0" />
      </span>
    </nav>
  );
}
