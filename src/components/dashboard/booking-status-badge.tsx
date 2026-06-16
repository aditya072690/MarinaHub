import { Badge } from "@/components/ui/badge";
import { CONSUMER_STATUS_LABELS } from "@/lib/bookings/state-machine";
import type { BookingStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    variant: "outline",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100",
    variant: "default",
  },
  checked_in: {
    label: "Checked In",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100",
    variant: "default",
  },
  checked_out: {
    label: "Checked Out",
    className: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100",
    variant: "default",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    variant: "secondary",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    variant: "destructive",
  },
  no_show: {
    label: "No Show",
    className: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100",
    variant: "outline",
  },
};

export function BookingStatusBadge({
  status,
  consumer = false,
}: {
  status: BookingStatus;
  consumer?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const label = consumer ? CONSUMER_STATUS_LABELS[status] : config.label;
  return (
    <Badge variant={config.variant} className={cn("capitalize", config.className)}>
      {label}
    </Badge>
  );
}
