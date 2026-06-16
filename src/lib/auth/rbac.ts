import type { UserRole } from "@/types/database";

export type Permission =
  | "dashboard:view"
  | "bookings:read"
  | "bookings:create"
  | "bookings:confirm"
  | "bookings:cancel"
  | "bookings:complete"
  | "bookings:checkin"
  | "boats:write"
  | "blocks:write"
  | "customers:read"
  | "customers:write"
  | "analytics:view"
  | "team:manage"
  | "settings:manage"
  | "widget:manage"
  | "onboarding:write"
  | "email_templates:view";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "dashboard:view",
    "bookings:read",
    "bookings:create",
    "bookings:confirm",
    "bookings:cancel",
    "bookings:complete",
    "bookings:checkin",
    "boats:write",
    "blocks:write",
    "customers:read",
    "customers:write",
    "analytics:view",
    "team:manage",
    "settings:manage",
    "widget:manage",
    "onboarding:write",
    "email_templates:view",
  ],
  manager: [
    "dashboard:view",
    "bookings:read",
    "bookings:create",
    "bookings:confirm",
    "bookings:cancel",
    "bookings:complete",
    "bookings:checkin",
    "boats:write",
    "blocks:write",
    "customers:read",
    "customers:write",
    "analytics:view",
    "email_templates:view",
  ],
  staff: [
    "dashboard:view",
    "bookings:read",
    "bookings:create",
    "bookings:complete",
    "bookings:checkin",
    "customers:read",
  ],
};

export function can(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(
  role: UserRole | null,
  permission: Permission
): void {
  if (!can(role, permission)) {
    throw new Error("Forbidden");
  }
}
