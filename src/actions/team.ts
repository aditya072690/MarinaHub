"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface TeamMemberRow {
  id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  full_name: string | null;
  email: string;
}

export async function getTeamMembers(marinaId: string): Promise<TeamMemberRow[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("marina_members")
    .select("id, user_id, role, joined_at")
    .eq("marina_id", marinaId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);
  const admin = createAdminClient();
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profileError) throw new Error(profileError.message);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return members.map((m) => {
    const profile = profileById.get(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role as UserRole,
      joined_at: m.joined_at,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? "",
    };
  });
}
