import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { BookingStatusHistory } from "@/types/database";
import { format } from "date-fns";
import { History } from "lucide-react";

export function BookingTimeline({ history }: { history: BookingStatusHistory[] }) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No status history"
        description="Status changes and check-in events are recorded here."
        className="border-0 py-6"
      />
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-slate-200 pl-6">
      {history.map((entry, index) => (
        <li key={entry.id} className="relative pb-6 last:pb-0">
          <span
            className="absolute -left-[25px] flex h-3 w-3 rounded-full bg-sky-500 ring-4 ring-white"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            {entry.from_status ? (
              <>
                <BookingStatusBadge status={entry.from_status} />
                <span className="text-muted-foreground">→</span>
              </>
            ) : null}
            <BookingStatusBadge status={entry.to_status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
            {entry.source ? ` · ${entry.source}` : ""}
          </p>
          {entry.notes && (
            <p className="mt-1 text-sm text-slate-600">{entry.notes}</p>
          )}
          {index === history.length - 1 && (
            <span className="sr-only">Most recent event</span>
          )}
        </li>
      ))}
    </ol>
  );
}
