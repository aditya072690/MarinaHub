import type { UserRole } from "@/types/database";

export type ExportType = "bookings" | "customers" | "revenue";

export function canExportData(role: UserRole | null, type: ExportType): boolean {
  if (!role) return false;
  if (type === "revenue") return role === "owner";
  return role === "owner" || role === "manager";
}
