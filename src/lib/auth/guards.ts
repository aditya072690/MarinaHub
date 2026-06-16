import type { UserRole } from "@/types/database";
import type { SessionContext } from "./session";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function assertMarinaAccess(
  session: SessionContext,
  marinaId: string,
  permission?: (role: UserRole | null) => boolean
) {
  const membership = session.memberships.find((m) => m.marina_id === marinaId);
  if (!membership) {
    throw new AuthError("Forbidden");
  }
  if (permission && !permission(membership.role)) {
    throw new AuthError("Forbidden");
  }
  return membership;
}

export function assertActiveMarina(
  session: SessionContext,
  marinaId: string,
  permission?: (role: UserRole | null) => boolean
) {
  if (session.activeMarina?.id !== marinaId) {
    throw new AuthError("Forbidden");
  }
  return assertMarinaAccess(session, marinaId, permission);
}
