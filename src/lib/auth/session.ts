import { cache } from "react";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Marina, MarinaMember, UserRole } from "@/types/database";
import { cookies } from "next/headers";

const MEMBERSHIP_SELECT =
  "id, marina_id, role, user_id, invited_by, joined_at, marinas(id, name, slug, timezone, logo_url)";

export interface SessionContext {
  userId: string;
  email: string;
  memberships: (MarinaMember & { marinas: Marina })[];
  activeMarina: Marina | null;
  activeRole: UserRole | null;
}

async function resolveSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return null;

  const { data: memberships } = await supabase
    .from("marina_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", user.id);

  const cookieStore = await cookies();
  const activeMarinaId = cookieStore.get("mh_marina")?.value;

  const typedMemberships = (memberships ?? []) as unknown as (MarinaMember & {
    marinas: Marina;
  })[];

  const activeMembership =
    typedMemberships.find((m) => m.marina_id === activeMarinaId) ??
    typedMemberships[0] ??
    null;

  return {
    userId: user.id,
    email: user.email ?? "",
    memberships: typedMemberships,
    activeMarina: activeMembership?.marinas ?? null,
    activeRole: activeMembership?.role ?? null,
  };
}

export const getSessionContext = cache(resolveSessionContext);

export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) throw new Error("Unauthorized");
  return session;
}
