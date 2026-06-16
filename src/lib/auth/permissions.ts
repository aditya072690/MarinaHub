import type { UserRole } from "@/types/database";
import { can, type Permission } from "./rbac";

export function canManageBoats(role: UserRole | null): boolean {
  return can(role, "boats:write");
}

export function canCancelBooking(role: UserRole | null): boolean {
  return can(role, "bookings:cancel");
}

export function canConfirmBooking(role: UserRole | null): boolean {
  return can(role, "bookings:confirm");
}

export function canCompleteBooking(role: UserRole | null): boolean {
  return can(role, "bookings:complete");
}

export function canCheckInOut(role: UserRole | null): boolean {
  return can(role, "bookings:checkin");
}

export function canManageBlocks(role: UserRole | null): boolean {
  return can(role, "blocks:write");
}

export function canManageTeam(role: UserRole | null): boolean {
  return can(role, "team:manage");
}

export function canManageSettings(role: UserRole | null): boolean {
  return can(role, "settings:manage");
}

export function canManageWidget(role: UserRole | null): boolean {
  return can(role, "widget:manage");
}

export function canViewAnalytics(role: UserRole | null): boolean {
  return can(role, "analytics:view");
}

export function canEditCustomers(role: UserRole | null): boolean {
  return can(role, "customers:write");
}

export function canViewCustomers(role: UserRole | null): boolean {
  return can(role, "customers:read");
}

export function canManageOnboarding(role: UserRole | null): boolean {
  return can(role, "onboarding:write");
}

export function canViewEmailTemplates(role: UserRole | null): boolean {
  return can(role, "email_templates:view");
}

export function hasPermission(role: UserRole | null, permission: Permission): boolean {
  return can(role, permission);
}
