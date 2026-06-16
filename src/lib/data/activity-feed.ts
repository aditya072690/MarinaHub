import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/types/database";
import { cache } from "react";

export const getCachedActivityFeed = cache(
  async (
    marinaId: string,
    limit = 50,
    cursor?: string
  ): Promise<AuditLog[]> => {
    const session = await requireSession();
    assertActiveMarina(session, marinaId);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_marina_activity_feed", {
      p_marina_id: marinaId,
      p_limit: limit,
      p_cursor: cursor ?? null,
    });

    if (error) throw new Error(error.message);
    return (data ?? []).map((row: AuditLog) => ({
      ...row,
      metadata: row.metadata ?? {},
    }));
  }
);
