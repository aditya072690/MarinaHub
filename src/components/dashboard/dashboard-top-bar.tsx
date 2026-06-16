"use client";

import { switchAuthContext } from "@/actions/auth";
import type { NotificationsBellData } from "@/lib/data/notifications-bell";
import { NotificationBell } from "@/components/dashboard/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { useMarina } from "@/providers/marina-provider";
import { User } from "lucide-react";

interface DashboardTopBarProps {
  showConsumerSwitch?: boolean;
  initialNotifications: NotificationsBellData;
}

export function DashboardTopBar({
  showConsumerSwitch = false,
  initialNotifications,
}: DashboardTopBarProps) {
  const { userId, marina } = useMarina();
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="dash-top-bar">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="sb-hamburger"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span className="sb-ham-lines">
            <span className="sb-ham-line sb-ham-line-1" />
            <span className="sb-ham-line sb-ham-line-2" />
            <span className="sb-ham-line sb-ham-line-3" />
          </span>
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showConsumerSwitch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => switchAuthContext("consumer")}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">My Account</span>
          </Button>
        )}
        <NotificationBell
          userId={userId}
          marinaId={marina.id}
          initialData={initialNotifications}
        />
      </div>
    </div>
  );
}
