"use client";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import type { NotificationsBellData } from "@/lib/data/notifications-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import { Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell({
  userId,
  marinaId,
  initialData,
}: {
  userId: string;
  marinaId?: string;
  initialData: NotificationsBellData;
}) {
  const [unread, setUnread] = useState(initialData.unreadCount);
  const [items, setItems] = useState<Notification[]>(initialData.list);
  const [open, setOpen] = useState(false);
  const seenIds = useRef(new Set(initialData.list.map((n) => n.id)));

  useEffect(() => {
    setItems(initialData.list);
    setUnread(initialData.unreadCount);
    seenIds.current = new Set(initialData.list.map((n) => n.id));
  }, [initialData, marinaId]);

  useEffect(() => {
    const supabase = createClient();
    const channelId = `notifications:${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          if (marinaId && n.marina_id !== marinaId) return;
          if (seenIds.current.has(n.id)) return;
          seenIds.current.add(n.id);
          setItems((prev) => [n, ...prev].slice(0, 10));
          setUnread((c) => c + 1);
          toast.info(n.title, { description: n.body ?? undefined });
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId, marinaId]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    setUnread((c) => Math.max(0, c - 1));
  }

  async function handleMarkAll() {
    await markAllNotificationsRead(marinaId);
    setUnread(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            Notifications
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-normal text-sky-600 hover:underline"
                onClick={handleMarkAll}
              >
                Mark all read
              </button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <BellOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground">No new notifications.</p>
          </div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
              onClick={() => !n.read_at && handleMarkRead(n.id)}
            >
              <span className={`text-sm font-medium ${!n.read_at ? "text-slate-900" : "text-muted-foreground"}`}>
                {n.title}
              </span>
              {n.body && (
                <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-sky-600"
          onClick={() => {
            setOpen(false);
            window.location.href = "/dashboard/notifications";
          }}
        >
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
