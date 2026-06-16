"use client";

import {
  getNotifications,
  markNotificationRead,
} from "@/actions/notifications";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filterNotifications,
  getNotificationCategory,
  getNotificationCategoryLabel,
  getNotificationQuickAction,
  isPriorityNotification,
  type NotificationCategory,
  type NotificationPriorityFilter,
  type NotificationReadFilter,
} from "@/lib/dashboard/notification-utils";
import { gsap } from "@/lib/animations/gsap-init";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";
import { useGSAP } from "@gsap/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Anchor,
  Bell,
  BellRing,
  CalendarCheck,
  CreditCard,
  Search,
  Ship,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

const CATEGORY_TABS: {
  value: NotificationCategory;
  label: string;
  icon: typeof Bell;
}[] = [
  { value: "all", label: "All", icon: Bell },
  { value: "bookings", label: "Bookings", icon: CalendarCheck },
  { value: "payments", label: "Payments", icon: CreditCard },
  { value: "fleet", label: "Fleet", icon: Ship },
  { value: "system", label: "System", icon: Anchor },
];

function categoryIcon(type: Notification["type"]) {
  const category = getNotificationCategory(type);
  switch (category) {
    case "bookings":
      return CalendarCheck;
    case "payments":
      return CreditCard;
    case "fleet":
      return Ship;
    default:
      return BellRing;
  }
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const unread = !notification.read_at;
  const priority = isPriorityNotification(notification);
  const category = getNotificationCategory(notification.type);
  const Icon = categoryIcon(notification.type);
  const quickAction = getNotificationQuickAction(notification);

  function handleTouchStart(event: React.TouchEvent) {
    startX.current = event.touches[0]?.clientX ?? 0;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (!unread) return;
    const endX = event.changedTouches[0]?.clientX ?? 0;
    if (startX.current - endX > 72) {
      onMarkRead(notification.id);
    }
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "notif-card",
        unread && "notif-card--unread",
        priority && "notif-card--priority"
      )}
      data-dash-row
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="notif-card-icon-wrap" aria-hidden>
        <Icon className="notif-card-icon" />
      </div>

      <div className="notif-card-body">
        <div className="notif-card-top">
          <div className="notif-card-badges">
            <span className="notif-badge notif-badge--category">
              {getNotificationCategoryLabel(category)}
            </span>
            {priority && unread ? (
              <span className="notif-badge notif-badge--priority">
                <AlertCircle className="h-3 w-3" />
                Priority
              </span>
            ) : null}
            {unread ? <span className="notif-unread-dot" aria-label="Unread" /> : null}
          </div>
          <time
            className="notif-card-time"
            dateTime={notification.created_at}
          >
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </time>
        </div>

        <p className="notif-card-title">{notification.title}</p>
        {notification.body ? (
          <p className="notif-card-body-text">{notification.body}</p>
        ) : null}

        {quickAction ? (
          <div className="notif-card-actions">
            <Link
              href={quickAction.href}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "notif-action-btn",
              })}
            >
              {quickAction.label}
            </Link>
            {unread ? (
              <Button
                variant="ghost"
                size="sm"
                className="notif-action-btn"
                onClick={() => onMarkRead(notification.id)}
              >
                Mark read
              </Button>
            ) : null}
          </div>
        ) : unread ? (
          <div className="notif-card-actions">
            <Button
              variant="ghost"
              size="sm"
              className="notif-action-btn"
              onClick={() => onMarkRead(notification.id)}
            >
              Mark read
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NotificationsFeed({
  initialItems,
  initialCursor,
  marinaId,
}: {
  initialItems: Notification[];
  initialCursor: string | null;
  marinaId?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [readFilter, setReadFilter] = useState<NotificationReadFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<NotificationPriorityFilter>("all");
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = filterNotifications(items, {
    category,
    readFilter,
    priorityFilter,
    search,
  });

  const unreadCount = items.filter((item) => !item.read_at).length;

  useGSAP(
    () => {
      const cards = listRef.current?.querySelectorAll(".notif-card");
      if (!cards?.length) return;

      gsap.from(cards, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { dependencies: [category, readFilter, priorityFilter, search, items.length] }
  );

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await getNotifications(20, cursor, marinaId);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    const result = await markNotificationRead(id);
    if (!result.success) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, read_at: new Date().toISOString() }
          : item
      )
    );
  }

  return (
    <div className="notif-center" data-dash-animate>
      <div className="notif-toolbar">
        <div className="notif-search-wrap">
          <Search className="notif-search-icon" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notifications…"
            className="notif-search-input"
            aria-label="Search notifications"
          />
        </div>

        <div className="notif-filter-row">
          <div className="dash-filter-chips" role="group" aria-label="Read status">
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["read", "Read"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "dash-filter-chip",
                  readFilter === value && "dash-filter-chip--active"
                )}
                onClick={() => setReadFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="dash-filter-chips" role="group" aria-label="Priority">
            {(
              [
                ["all", "All"],
                ["priority", "Priority"],
                ["normal", "Normal"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "dash-filter-chip",
                  priorityFilter === value && "dash-filter-chip--active"
                )}
                onClick={() => setPriorityFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="notif-tabs" role="tablist" aria-label="Notification categories">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = category === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn("notif-tab", active && "notif-tab--active")}
              onClick={() => setCategory(tab.value)}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="notif-summary">
        <span>
          {filtered.length} notification{filtered.length === 1 ? "" : "s"}
        </span>
        {unreadCount > 0 ? (
          <span className="notif-summary-unread">{unreadCount} unread</span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="New bookings, confirmations, and cancellations will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No notifications match"
          description="Try adjusting your filters or search query."
          actionLabel="Clear filters"
          onAction={() => {
            setCategory("all");
            setReadFilter("all");
            setPriorityFilter("all");
            setSearch("");
          }}
        />
      ) : (
        <div ref={listRef} className="notif-list">
          {filtered.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}

      {cursor ? (
        <div className="notif-load-more">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      <p className="notif-swipe-hint lg:hidden">
        Swipe left on a notification to mark it read
      </p>
    </div>
  );
}
