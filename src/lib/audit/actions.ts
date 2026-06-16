/** Canonical audit action names — keep in sync with DB triggers */
export const AUDIT_ACTIONS = {
  boat: {
    added: "boat.added",
    updated: "boat.updated",
    deleted: "boat.deleted",
  },
  booking: {
    created: "booking.created",
    updated: "booking.updated",
    cancelled: "booking.cancelled",
    checked_in: "booking.checked_in",
    checked_out: "booking.checked_out",
    completed: "booking.completed",
  },
  pricing_rule: {
    created: "pricing_rule.created",
    updated: "pricing_rule.updated",
    deleted: "pricing_rule.deleted",
  },
  block: {
    created: "block.created",
    updated: "block.updated",
    deleted: "block.deleted",
  },
  maintenance: {
    created: "maintenance.created",
    updated: "maintenance.updated",
    deleted: "maintenance.deleted",
  },
  marina_settings: {
    updated: "marina_settings.updated",
  },
  marina_holiday: {
    created: "marina_holiday.created",
    updated: "marina_holiday.updated",
    deleted: "marina_holiday.deleted",
  },
  waitlist: {
    joined: "waitlist.joined",
    notified: "waitlist.notified",
    converted: "waitlist.converted",
    cancelled: "waitlist.cancelled",
    expired: "waitlist.expired",
  },
  team: {
    member_invited: "team.member_invited",
    member_role_changed: "team.member_role_changed",
    member_removed: "team.member_removed",
  },
  customer: {
    vip_flagged: "customer.vip_flagged",
  },
} as const;

export type AuditAction =
  (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS][keyof (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]];

/** Actions eligible for the realtime activity feed by default */
export const FEED_ACTIONS: readonly string[] = [
  AUDIT_ACTIONS.boat.added,
  AUDIT_ACTIONS.boat.updated,
  AUDIT_ACTIONS.boat.deleted,
  AUDIT_ACTIONS.booking.created,
  AUDIT_ACTIONS.booking.updated,
  AUDIT_ACTIONS.booking.cancelled,
  AUDIT_ACTIONS.booking.checked_in,
  AUDIT_ACTIONS.booking.checked_out,
  AUDIT_ACTIONS.booking.completed,
  AUDIT_ACTIONS.pricing_rule.created,
  AUDIT_ACTIONS.pricing_rule.updated,
  AUDIT_ACTIONS.pricing_rule.deleted,
  AUDIT_ACTIONS.block.created,
  AUDIT_ACTIONS.block.updated,
  AUDIT_ACTIONS.block.deleted,
  AUDIT_ACTIONS.maintenance.created,
  AUDIT_ACTIONS.maintenance.updated,
  AUDIT_ACTIONS.waitlist.joined,
  AUDIT_ACTIONS.waitlist.notified,
  AUDIT_ACTIONS.waitlist.converted,
  AUDIT_ACTIONS.waitlist.cancelled,
];
