"use client";

import { ActivityFeedItem } from "@/components/dashboard/activity-feed-item";
import {
  getDateFilterLabel,
  getEntityFilterLabel,
  groupActivityByDate,
} from "@/components/dashboard/activity-feed-utils";
import { getActivityFeed } from "@/actions/audit-logs";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/types/database";
import { subDays } from "date-fns";
import { Activity, Filter, Radio, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ActivityFeedProps {
  marinaId: string;
  limit?: number;
  compact?: boolean;
  showFilters?: boolean;
  initialItems?: AuditLog[];
}

type DateFilter = "all" | "today" | "week";
type EntityFilter =
  | "all"
  | "booking"
  | "boat"
  | "customer"
  | "payment"
  | "availability_block";

export function ActivityFeed({
  marinaId,
  limit = 15,
  compact = false,
  showFilters = false,
  initialItems,
}: ActivityFeedProps) {
  const [items, setItems] = useState<AuditLog[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);
  const [live, setLive] = useState(false);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    if (initialItems !== undefined) {
      setItems(initialItems);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const feed = await getActivityFeed(marinaId, limit);
        if (!controller.signal.aborted) {
          setItems(feed);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setItems([]);
    setLive(false);
    void load();

    return () => {
      controller.abort();
    };
  }, [marinaId, limit, initialItems]);

  useEffect(() => {
    const supabase = createClient();
    const channelId = `marina:${marinaId}:activity-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `marina_id=eq.${marinaId}`,
        },
        (payload) => {
          const entry = payload.new as AuditLog;
          if (entry.show_in_feed) {
            setItems((prev) => [entry, ...prev].slice(0, limit));
            setLive(true);
            setTimeout(() => setLive(false), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [marinaId, limit]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const weekCutoff = subDays(new Date(), 7);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      if (entityFilter !== "all" && item.entity_type !== entityFilter) {
        return false;
      }

      const created = new Date(item.created_at);
      if (dateFilter === "today" && created < todayStart) return false;
      if (dateFilter === "week" && created < weekCutoff) return false;

      if (!query) return true;
      return (
        item.summary.toLowerCase().includes(query) ||
        item.action.toLowerCase().includes(query) ||
        item.entity_type.toLowerCase().includes(query)
      );
    });
  }, [items, search, entityFilter, dateFilter]);

  const groupedItems = useMemo(
    () => (showFilters && !compact ? groupActivityByDate(filteredItems) : null),
    [filteredItems, showFilters, compact]
  );

  if (loading) {
    return (
      <DashCard hover={false} className="dash-activity-card" data-dash-animate>
        {!compact && showFilters ? null : (
          <DashCardHeader>
            <DashCardTitle className="dash-card-title-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#1A9DC4]" />
              {compact ? "Recent Activity" : "Activity Feed"}
            </DashCardTitle>
          </DashCardHeader>
        )}
        <DashCardContent className="space-y-3">
          {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </DashCardContent>
      </DashCard>
    );
  }

  return (
    <DashCard hover={false} className="dash-activity-card" data-dash-animate>
      {!compact && !showFilters ? (
        <DashCardHeader>
          <DashCardTitle className="dash-card-title-lg flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#1A9DC4]" />
              Activity Feed
            </span>
            {live && <LiveBadge />}
          </DashCardTitle>
        </DashCardHeader>
      ) : null}

      <DashCardContent
        className={showFilters && !compact ? "dash-activity-panel" : undefined}
      >
        {showFilters && !compact && (
          <>
            <div className="dash-activity-intro">
              <p>
                A live timeline of bookings, fleet changes, schedule blocks, and
                marina updates. Click any event to open the related record.
              </p>
              {live ? <LiveBadge /> : null}
            </div>

            <div className="dash-activity-toolbar">
              <div className="dash-activity-toolbar-search relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A6580]"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by guest, boat, or action…"
                  className="h-10 border-[rgba(11,31,58,0.12)] bg-white pl-9 text-sm shadow-sm"
                  aria-label="Search activity"
                />
              </div>
              <Select
                value={entityFilter}
                onValueChange={(v) => setEntityFilter(v as EntityFilter)}
              >
                <SelectTrigger
                  className="dash-activity-filter h-10 border-[rgba(11,31,58,0.12)] bg-white text-sm shadow-sm"
                  aria-label="Filter by type"
                >
                  <SelectValue>{getEntityFilterLabel(entityFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="boat">Fleet</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="availability_block">Schedule blocks</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v as DateFilter)}
              >
                <SelectTrigger
                  className="dash-activity-filter h-10 border-[rgba(11,31,58,0.12)] bg-white text-sm shadow-sm"
                  aria-label="Filter by date"
                >
                  <SelectValue>{getDateFilterLabel(dateFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Past 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="dash-activity-count">
              Showing <strong>{filteredItems.length}</strong> of{" "}
              <strong>{items.length}</strong> events
            </p>
          </>
        )}

        {compact && (
          <DashCardHeader className="px-0 pt-0">
            <DashCardTitle className="dash-card-title-lg flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#1A9DC4]" />
                Recent Activity
              </span>
              {live && <LiveBadge />}
            </DashCardTitle>
          </DashCardHeader>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Bookings and status changes will appear here in real time."
            className="border-0 py-6"
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No matching activity"
            description="Try adjusting your search or filters."
            className="border-0 py-6"
          />
        ) : groupedItems ? (
          <div className="dash-activity-groups">
            {groupedItems.map((group) => (
              <section key={group.key} className="dash-activity-group">
                <h3 className="dash-activity-date-label">{group.label}</h3>
                <ul className="dash-activity-list dash-activity-list--rich">
                  {group.items.map((item) => (
                    <ActivityFeedItem key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul
            className={`dash-activity-list dash-activity-list--rich ${
              compact ? "max-h-72 overflow-y-auto pr-1" : ""
            }`}
          >
            {filteredItems.map((item) => (
              <ActivityFeedItem key={item.id} item={item} compact={compact} />
            ))}
          </ul>
        )}
      </DashCardContent>
    </DashCard>
  );
}

function LiveBadge() {
  return (
    <Badge
      variant="secondary"
      className="gap-1 border border-[rgba(26,157,196,0.2)] bg-[rgba(26,157,196,0.08)] text-xs text-[#1A9DC4] animate-pulse"
    >
      <Radio className="h-3 w-3" />
      Live
    </Badge>
  );
}
