"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MobileDataCard,
  MobileDataField,
  ResponsiveDataView,
} from "@/components/shared/responsive-data-view";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gsap } from "@/lib/animations/gsap-init";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types/database";
import { useGSAP } from "@gsap/react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import {
  ChevronDown,
  Download,
  ScrollText,
  Search,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

interface AuditLogTableProps {
  logs: AuditLog[];
}

type SortKey = "newest" | "oldest" | "user" | "event";

function exportCsv(rows: AuditLog[]) {
  const header = ["Time", "Action", "Summary", "Actor", "Visibility"];
  const lines = rows.map((log) => [
    format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
    log.action,
    `"${log.summary.replace(/"/g, '""')}"`,
    log.actor_role ?? "system",
    log.visibility,
  ]);
  const csv = [header, ...lines].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function AuditLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMeta = Object.keys(log.metadata ?? {}).length > 0;

  return (
    <>
      <tr
        className={cn("audit-row", hasMeta && "audit-row--expandable")}
        data-dash-row
        onClick={hasMeta ? onToggle : undefined}
      >
        <td className="audit-cell audit-cell--time">
          <span className="audit-time-primary">
            {format(new Date(log.created_at), "MMM d, yyyy")}
          </span>
          <span className="audit-time-secondary">
            {format(new Date(log.created_at), "h:mm a")}
          </span>
        </td>
        <td className="audit-cell">
          <Badge variant="outline" className="audit-action-badge font-mono text-xs">
            {log.action}
          </Badge>
        </td>
        <td className="audit-cell audit-cell--summary">
          <span className="line-clamp-2">{log.summary}</span>
        </td>
        <td className="audit-cell capitalize">{log.actor_role ?? "system"}</td>
        <td className="audit-cell">
          <Badge
            variant={log.visibility === "owner_only" ? "secondary" : "outline"}
            className="audit-visibility-badge"
          >
            {log.visibility}
          </Badge>
        </td>
        <td className="audit-cell audit-cell--expand">
          {hasMeta ? (
            <button
              type="button"
              className="audit-expand-btn"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse details" : "Expand details"}
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : null}
        </td>
      </tr>
      {expanded && hasMeta ? (
        <tr className="audit-detail-row">
          <td colSpan={6}>
            <div className="audit-detail-panel">
              <p className="audit-detail-label">Event details</p>
              <pre className="audit-detail-meta">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const actions = useMemo(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs]
  );

  const actors = useMemo(
    () =>
      [...new Set(logs.map((l) => l.actor_role ?? "system"))].sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    let rows = [...logs];

    if (actionFilter !== "all") {
      rows =
        actionFilter === "booking"
          ? rows.filter((l) => l.action.startsWith("booking."))
          : actionFilter === "waitlist"
            ? rows.filter((l) => l.action.startsWith("waitlist."))
            : actionFilter === "maintenance"
              ? rows.filter((l) => l.action.startsWith("maintenance."))
              : rows.filter((l) => l.action === actionFilter);
    }

    if (actorFilter !== "all") {
      rows = rows.filter((l) => (l.actor_role ?? "system") === actorFilter);
    }

    if (visibilityFilter !== "all") {
      rows = rows.filter((l) => l.visibility === visibilityFilter);
    }

    if (dateFrom) {
      const from = startOfDay(new Date(dateFrom));
      rows = rows.filter((l) => !isBefore(new Date(l.created_at), from));
    }

    if (dateTo) {
      const to = endOfDay(new Date(dateTo));
      rows = rows.filter((l) => !isAfter(new Date(l.created_at), to));
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (l) =>
          l.summary.toLowerCase().includes(query) ||
          l.action.toLowerCase().includes(query) ||
          (l.actor_role ?? "system").toLowerCase().includes(query)
      );
    }

    rows.sort((a, b) => {
      switch (sortKey) {
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "user":
          return (a.actor_role ?? "system").localeCompare(
            b.actor_role ?? "system"
          );
        case "event":
          return a.action.localeCompare(b.action);
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return rows;
  }, [
    logs,
    actionFilter,
    actorFilter,
    visibilityFilter,
    dateFrom,
    dateTo,
    search,
    sortKey,
  ]);

  useGSAP(
    () => {
      const rows = tableRef.current?.querySelectorAll(".audit-row");
      if (!rows?.length) return;

      gsap.from(rows, {
        opacity: 0,
        x: -8,
        duration: 0.3,
        stagger: 0.02,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { dependencies: [filtered.length, sortKey, actionFilter] }
  );

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No audit logs yet"
        description="Staff actions and system events are recorded here for compliance."
      />
    );
  }

  const table = (
    <div ref={tableRef} className="audit-table-wrap">
      <table className="dash-table audit-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Summary</th>
            <th>Actor</th>
            <th>Visibility</th>
            <th className="w-10" aria-label="Expand" />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8">
                <EmptyState
                  icon={Search}
                  title="No logs match these filters"
                  description="Try adjusting search, date range, or filter options."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setActionFilter("all");
                    setActorFilter("all");
                    setVisibilityFilter("all");
                    setSearch("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="border-0 py-6"
                />
              </td>
            </tr>
          ) : (
            filtered.map((log) => (
              <AuditLogRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === log.id ? null : log.id
                  )
                }
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const cards =
    filtered.length === 0 ? (
      <EmptyState
        icon={Search}
        title="No logs match these filters"
        description="Try adjusting search, date range, or filter options."
        actionLabel="Clear filters"
        onAction={() => {
          setActionFilter("all");
          setActorFilter("all");
          setVisibilityFilter("all");
          setSearch("");
          setDateFrom("");
          setDateTo("");
        }}
      />
    ) : (
      filtered.map((log) => (
        <MobileDataCard key={log.id} className="audit-mobile-card">
          <p className="mb-2 line-clamp-2 font-medium">{log.summary}</p>
          <MobileDataField label="Action">
            <Badge variant="outline" className="font-mono text-xs">
              {log.action}
            </Badge>
          </MobileDataField>
          <MobileDataField label="Time">
            {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
          </MobileDataField>
          <MobileDataField label="Actor">
            <span className="capitalize">{log.actor_role ?? "system"}</span>
          </MobileDataField>
          <MobileDataField label="Visibility">
            <Badge
              variant={log.visibility === "owner_only" ? "secondary" : "outline"}
            >
              {log.visibility}
            </Badge>
          </MobileDataField>
        </MobileDataCard>
      ))
    );

  return (
    <div className="audit-center space-y-4" data-dash-animate>
      <div className="audit-insights">
        <div className="audit-insight-card">
          <p className="audit-insight-label">Total events</p>
          <p className="audit-insight-value">{logs.length}</p>
        </div>
        <div className="audit-insight-card">
          <p className="audit-insight-label">Filtered</p>
          <p className="audit-insight-value">{filtered.length}</p>
        </div>
        <div className="audit-insight-card">
          <p className="audit-insight-label">Unique actions</p>
          <p className="audit-insight-value">{actions.length}</p>
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="audit-search-wrap">
          <Search className="audit-search-icon" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search summary, action, or actor…"
            className="audit-search-input"
            aria-label="Search audit logs"
          />
        </div>

        <div className="audit-toolbar-filters">
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
            <SelectTrigger className="audit-select">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="booking">All booking events</SelectItem>
              <SelectItem value="waitlist">All waitlist events</SelectItem>
              <SelectItem value="maintenance">All maintenance events</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actorFilter} onValueChange={(v) => setActorFilter(v ?? "all")}>
            <SelectTrigger className="audit-select">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actors.map((actor) => (
                <SelectItem key={actor} value={actor}>
                  {actor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={visibilityFilter}
            onValueChange={(v) => setVisibilityFilter(v ?? "all")}
          >
            <SelectTrigger className="audit-select">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="owner_only">Owner only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(v) => setSortKey((v as SortKey) ?? "newest")}>
            <SelectTrigger className="audit-select">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="user">By actor</SelectItem>
              <SelectItem value="event">By event type</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="audit-date-row">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="audit-date-input"
            aria-label="From date"
          />
          <span className="audit-date-sep">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="audit-date-input"
            aria-label="To date"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="audit-export-btn"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <ResponsiveDataView table={table} cards={cards} />
    </div>
  );
}
