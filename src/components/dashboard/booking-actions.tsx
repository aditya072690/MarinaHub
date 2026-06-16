"use client";

import {
  checkInBooking,
  checkOutBooking,
  updateBookingStatus,
} from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import {
  getAllowedActions,
  getTargetStatus,
  type BookingAction,
} from "@/lib/bookings/state-machine";
import type { Booking, BookingStatus, UserRole } from "@/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  confirm: "Confirm",
  cancel: "Cancel",
  complete: "Complete",
  no_show: "No Show",
  check_in: "Check In",
  check_out: "Check Out",
};

const RESTRICTED_HINTS: Partial<Record<BookingAction, string>> = {
  confirm: "Only owners and managers can confirm bookings",
  cancel: "Only owners and managers can cancel bookings",
  no_show: "Only owners and managers can mark no-shows",
};

function getRestrictedActions(
  status: BookingStatus,
  role: UserRole
): BookingAction[] {
  if (role !== "staff") return [];

  const managerActions = getAllowedActions(status, "manager");
  const staffActions = new Set(getAllowedActions(status, "staff"));
  const candidates: BookingAction[] = ["confirm", "cancel", "no_show"];

  return candidates.filter(
    (action) => managerActions.includes(action) && !staffActions.has(action)
  );
}

export function BookingActions({
  booking,
  role,
  showRestrictedHints = false,
}: {
  booking: Booking;
  role: UserRole;
  showRestrictedHints?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const actions = getAllowedActions(booking.status, role);
  const restricted = showRestrictedHints
    ? getRestrictedActions(booking.status, role)
    : [];

  async function runAction(action: string) {
    setLoading(true);
    try {
      if (action === "check_in") {
        const result = await checkInBooking(booking.id);
        if (!result.success) toast.error(result.error);
        else toast.success("Guest checked in");
      } else if (action === "check_out") {
        const result = await checkOutBooking(booking.id);
        if (!result.success) toast.error(result.error);
        else toast.success("Guest checked out");
      } else {
        const target = getTargetStatus(
          action as BookingAction,
          booking.status
        );
        if (!target) {
          toast.error("Invalid action");
          return;
        }
        const result = await updateBookingStatus(booking.id, target);
        if (!result.success) toast.error(result.error);
        else toast.success(`Booking ${target.replace("_", " ")}`);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (actions.length === 0 && restricted.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-busy={loading}>
      {actions.map((action) => (
        <Button
          key={action}
          size="sm"
          variant={action === "cancel" ? "outline" : "default"}
          className={action === "cancel" ? "" : "bg-sky-600 hover:bg-sky-700"}
          disabled={loading}
          onClick={() => runAction(action)}
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}
      {restricted.map((action) => (
        <Button
          key={`restricted-${action}`}
          size="sm"
          variant="outline"
          disabled
          title={RESTRICTED_HINTS[action]}
          className="cursor-not-allowed opacity-50"
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  );
}

export function CheckInOutPanel({
  booking,
  role,
}: {
  booking: Booking;
  role: UserRole;
}) {
  const actions = getAllowedActions(booking.status, role).filter((a) =>
    ["check_in", "check_out", "complete"].includes(a)
  );

  if (
    !["confirmed", "checked_in", "checked_out"].includes(booking.status) &&
    actions.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <h3 className="mb-1 font-semibold">Check-in / Check-out</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        {booking.status === "confirmed" && "Guest has not checked in yet."}
        {booking.status === "checked_in" && "Guest is on the water."}
        {booking.status === "checked_out" && "Guest has returned — complete the booking."}
        {booking.status === "completed" && "Trip completed."}
      </p>
      {booking.checked_in_at && (
        <p className="mb-1 text-xs text-muted-foreground">
          Checked in: {new Date(booking.checked_in_at).toLocaleString()}
        </p>
      )}
      {booking.checked_out_at && (
        <p className="mb-3 text-xs text-muted-foreground">
          Checked out: {new Date(booking.checked_out_at).toLocaleString()}
        </p>
      )}
      <BookingActions booking={booking} role={role} />
    </div>
  );
}
