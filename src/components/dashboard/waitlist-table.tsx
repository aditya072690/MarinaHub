"use client";

import { cancelWaitlistEntry } from "@/actions/waitlist";
import { DashCard, DashCardContent } from "@/components/dashboard/dash-card";
import { DashboardSortSelect } from "@/components/dashboard/dashboard-sort-select";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import type { WaitlistEntry } from "@/types/database";
import { ListOrdered, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_VARIANT: Record<
  WaitlistEntry["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  active: "default",
  notified: "secondary",
  converted: "outline",
  expired: "outline",
  cancelled: "destructive",
};

type WaitlistSort = "date-asc" | "date-desc" | "guest-asc";
type StatusFilter = WaitlistEntry["status"] | "all";

const SORT_OPTIONS: { value: WaitlistSort; label: string }[] = [
  { value: "date-asc", label: "Soonest slot" },
  { value: "date-desc", label: "Latest slot" },
  { value: "guest-asc", label: "Guest A–Z" },
];

export function WaitlistTable({
  marinaId,
  entries,
  timezone = DEFAULT_TIMEZONE,
}: {
  marinaId: string;
  entries: WaitlistEntry[];
  timezone?: string;
}) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<WaitlistSort>("date-asc");

  async function handleCancel(entryId: string) {
    setCancellingId(entryId);
    const result = await cancelWaitlistEntry(marinaId, entryId);
    setCancellingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Waitlist entry cancelled");
    router.refresh();
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = entries.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [entry.guest_name, entry.guest_email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "date-desc":
          return (
            new Date(b.desired_start_at).getTime() -
            new Date(a.desired_start_at).getTime()
          );
        case "guest-asc":
          return (a.guest_name ?? "").localeCompare(b.guest_name ?? "");
        case "date-asc":
        default:
          return (
            new Date(a.desired_start_at).getTime() -
            new Date(b.desired_start_at).getTime()
          );
      }
    });

    return rows;
  }, [entries, search, statusFilter, sort]);

  if (entries.length === 0) {
    return (
      <DashCard hover={false} data-dash-animate>
        <DashCardContent>
          <EmptyState
            icon={ListOrdered}
            title="No waitlist entries"
            description="Guests join the waitlist when their preferred slot is unavailable."
          />
        </DashCardContent>
      </DashCard>
    );
  }

  return (
    <DashCard hover={false} data-dash-animate>
      <DashCardContent className="space-y-4 p-4 sm:p-5">
        <div className="fleet-toolbar">
          <div className="fleet-toolbar-search relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A6580]"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest name or email…"
              className="h-10 border-[rgba(11,31,58,0.12)] bg-white pl-9 text-sm shadow-sm"
              aria-label="Search waitlist"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="fleet-toolbar-select h-10 border-[rgba(11,31,58,0.12)] bg-white text-sm shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="notified">Notified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <DashboardSortSelect
            value={sort}
            onValueChange={setSort}
            options={SORT_OPTIONS}
          />
        </div>

        <p className="fleet-toolbar-meta">
          Showing {filtered.length} of {entries.length} entries
        </p>

        {filtered.length === 0 ? (
          <p className="fleet-empty-filter py-8 text-center text-sm text-[#4A6580]">
            No entries match your filters.
          </p>
        ) : (
          <>
            <div className="hidden lg:block dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">Guest</th>
                    <th scope="col">Email</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Guests</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} data-dash-row>
                      <td className="font-medium">
                        {entry.guest_name ?? "—"}
                      </td>
                      <td>{entry.guest_email ?? "—"}</td>
                      <td className="whitespace-nowrap text-sm">
                        {formatInMarinaTimezone(
                          entry.desired_start_at,
                          timezone,
                          "MMM d h:mm a"
                        )}
                        {" – "}
                        {formatInMarinaTimezone(
                          entry.desired_end_at,
                          timezone,
                          "h:mm a"
                        )}
                      </td>
                      <td>{entry.guest_count}</td>
                      <td>
                        <Badge
                          variant={STATUS_VARIANT[entry.status]}
                          className="capitalize"
                        >
                          {entry.status}
                        </Badge>
                        {entry.notified_at && (
                          <p className="mt-1 text-xs text-[#4A6580]">
                            Notified{" "}
                            {formatInMarinaTimezone(
                              entry.notified_at,
                              timezone,
                              "MMM d"
                            )}
                          </p>
                        )}
                      </td>
                      <td className="text-right">
                        {(entry.status === "active" ||
                          entry.status === "notified") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[44px]"
                            disabled={cancellingId === entry.id}
                            onClick={() => handleCancel(entry.id)}
                          >
                            {cancellingId === entry.id && (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fleet-mobile-grid lg:hidden">
              {filtered.map((entry) => (
                <article key={entry.id} className="fleet-mobile-card" data-dash-row>
                  <div className="fleet-mobile-card-top">
                    <p className="fleet-mobile-title">
                      {entry.guest_name ?? "Guest"}
                    </p>
                    <Badge
                      variant={STATUS_VARIANT[entry.status]}
                      className="capitalize"
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="fleet-mobile-body">
                    <div className="fleet-mobile-details">
                      <div className="fleet-mobile-detail">
                        <span className="fleet-mobile-detail-label">Email</span>
                        <span className="fleet-mobile-detail-value">
                          {entry.guest_email ?? "—"}
                        </span>
                      </div>
                      <div className="fleet-mobile-detail">
                        <span className="fleet-mobile-detail-label">Dates</span>
                        <span className="fleet-mobile-detail-value">
                          {formatInMarinaTimezone(
                            entry.desired_start_at,
                            timezone,
                            "MMM d h:mm a"
                          )}
                        </span>
                      </div>
                      <div className="fleet-mobile-detail">
                        <span className="fleet-mobile-detail-label">Guests</span>
                        <span className="fleet-mobile-detail-value">
                          {entry.guest_count}
                        </span>
                      </div>
                    </div>
                    {(entry.status === "active" ||
                      entry.status === "notified") && (
                      <div className="fleet-mobile-actions">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] w-full"
                          disabled={cancellingId === entry.id}
                          onClick={() => handleCancel(entry.id)}
                        >
                          {cancellingId === entry.id && (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          )}
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </DashCardContent>
    </DashCard>
  );
}
