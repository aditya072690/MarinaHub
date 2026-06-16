"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getCachedActivityFeed } from "@/lib/data/activity-feed";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/types/database";

export async function getAuditLogs(
  marinaId: string,
  options?: { action?: string; limit?: number; cursor?: string }
): Promise<AuditLog[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageSettings);

  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, marina_id, action, entity_type, entity_id, actor_id, actor_role, metadata, created_at, summary, show_in_feed, visibility")
    .eq("marina_id", marinaId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.action) {
    query = query.eq("action", options.action);
  }
  if (options?.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLog[];
}

export async function getActivityFeed(
  marinaId: string,
  limit = 50,
  cursor?: string
): Promise<AuditLog[]> {
  return getCachedActivityFeed(marinaId, limit, cursor);
}
