import { createClient } from "@/lib/supabase/server";
import type { AuditLogVisibility } from "@/types/database";

export async function writeAuditLog(params: {
  marinaId: string;
  action: string;
  entityType: string;
  summary: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  visibility?: AuditLogVisibility;
  showInFeed?: boolean;
}) {
  const supabase = await createClient();
  await supabase.rpc("write_audit_log", {
    p_marina_id: params.marinaId,
    p_action: params.action,
    p_entity_type: params.entityType,
    p_summary: params.summary,
    p_entity_id: params.entityId,
    p_metadata: params.metadata ?? {},
    p_visibility: params.visibility ?? "staff",
    p_show_in_feed: params.showInFeed ?? true,
  });
}
