import type { BookingStatus, UserRole } from "@/types/database";

export type BookingAction =
  | "confirm"
  | "cancel"
  | "complete"
  | "no_show"
  | "check_in"
  | "check_out";

const TRANSITIONS: Record<
  BookingStatus,
  Partial<Record<BookingAction, BookingStatus>>
> = {
  pending: { confirm: "confirmed", cancel: "cancelled" },
  confirmed: {
    check_in: "checked_in",
    cancel: "cancelled",
    no_show: "no_show",
  },
  checked_in: { check_out: "checked_out" },
  checked_out: { complete: "completed" },
  cancelled: {},
  completed: {},
  no_show: {},
};

const ACTION_PERMISSIONS: Record<BookingAction, (role: UserRole | null) => boolean> = {
  confirm: (role) => role === "owner" || role === "manager",
  cancel: (role) => role === "owner" || role === "manager",
  complete: (role) => role === "owner" || role === "manager" || role === "staff",
  no_show: (role) => role === "owner" || role === "manager",
  check_in: (role) => role === "owner" || role === "manager" || role === "staff",
  check_out: (role) => role === "owner" || role === "manager" || role === "staff",
};

export function getTargetStatus(
  action: BookingAction,
  currentStatus: BookingStatus
): BookingStatus | null {
  return TRANSITIONS[currentStatus][action] ?? null;
}

export function getAllowedActions(
  currentStatus: BookingStatus,
  role: UserRole | null
): BookingAction[] {
  const actions: BookingAction[] = [];

  for (const [action, target] of Object.entries(TRANSITIONS[currentStatus]) as [
    BookingAction,
    BookingStatus,
  ][]) {
    if (target && ACTION_PERMISSIONS[action](role)) {
      actions.push(action);
    }
  }

  return actions;
}

export function validateTransition(
  from: BookingStatus,
  to: BookingStatus,
  role: UserRole | null
): { valid: boolean; error?: string } {
  const action = (
    Object.entries(TRANSITIONS[from]) as [BookingAction, BookingStatus][]
  ).find(([, target]) => target === to)?.[0];

  if (!action) {
    return { valid: false, error: `Cannot transition from ${from} to ${to}` };
  }

  if (!ACTION_PERMISSIONS[action](role)) {
    return { valid: false, error: "You don't have permission for this action" };
  }

  return { valid: true };
}

export const CONSUMER_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting Confirmation",
  confirmed: "Confirmed",
  checked_in: "On the Water",
  checked_out: "Returned",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};
