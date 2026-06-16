"use client";

import { getActivityVisual } from "@/components/dashboard/activity-feed-utils";
import type { AuditLog } from "@/types/database";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function ActivityFeedItem({
  item,
  compact = false,
}: {
  item: AuditLog;
  compact?: boolean;
}) {
  const visual = getActivityVisual(item);
  const Icon = visual.icon;
  const created = new Date(item.created_at);
  const absoluteTime = format(created, "MMM d, yyyy · h:mm a");
  const relativeTime = formatDistance(created);

  const content = (
    <>
      <div
        className={`dash-activity-icon dash-activity-icon--${visual.iconTone}`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="dash-activity-content">
        <div className="dash-activity-meta">
          <span className="dash-activity-category">{visual.category}</span>
          <span className="dash-activity-dot" aria-hidden />
          <span className="dash-activity-action">{visual.actionLabel}</span>
          {item.actor_role ? (
            <>
              <span className="dash-activity-dot" aria-hidden />
              <span className="dash-activity-actor capitalize">
                {item.actor_role}
              </span>
            </>
          ) : null}
        </div>

        <p className={`dash-activity-headline ${compact ? "line-clamp-2" : ""}`}>
          {item.summary}
        </p>

        {visual.detail ? (
          <p className="dash-activity-detail">{visual.detail}</p>
        ) : null}
      </div>

      <div className="dash-activity-aside">
        <time
          className="dash-activity-timestamp"
          dateTime={item.created_at}
          title={absoluteTime}
        >
          {relativeTime}
        </time>
        {visual.href && !compact ? (
          <ChevronRight className="dash-activity-chevron" aria-hidden />
        ) : null}
      </div>
    </>
  );

  if (visual.href && !compact) {
    return (
      <li data-dash-row suppressHydrationWarning>
        <Link href={visual.href} className="dash-activity-row dash-activity-row--link">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="dash-activity-row" data-dash-row suppressHydrationWarning>
      {content}
    </li>
  );
}

function formatDistance(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return format(date, "MMM d");
}
