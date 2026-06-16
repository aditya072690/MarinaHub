import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/database";
import { cache } from "react";

export interface NotificationsBellData {
  list: Notification[];
  unreadCount: number;
}

export const getCachedNotificationsBell = cache(
  async (marinaId: string, limit = 10): Promise<NotificationsBellData> => {
    const session = await requireSession();
    const supabase = await createClient();

    const [listResult, countResult] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, type, title, body, read_at, created_at, marina_id, entity_type, entity_id"
        )
        .eq("recipient_id", session.userId)
        .eq("marina_id", marinaId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", session.userId)
        .eq("marina_id", marinaId)
        .is("read_at", null),
    ]);

    if (listResult.error) throw new Error(listResult.error.message);
    if (countResult.error) throw new Error(countResult.error.message);

    return {
      list: (listResult.data ?? []) as Notification[],
      unreadCount: countResult.count ?? 0,
    };
  }
);
