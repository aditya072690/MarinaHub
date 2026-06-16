"use server";

import { getCachedNotificationsBell } from "@/lib/data/notifications-bell";
import type { NotificationsBellData } from "@/lib/data/notifications-bell";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { Notification } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface NotificationsPage {
  items: Notification[];
  nextCursor: string | null;
}

export async function getNotifications(
  limit = 20,
  before?: string,
  marinaId?: string
): Promise<NotificationsPage> {
  const session = await requireSession();
  const supabase = await createClient();
  const scopedMarinaId = marinaId ?? session.activeMarina?.id ?? null;

  let query = supabase
    .from("notifications")
    .select("id, type, title, body, read_at, created_at, marina_id, entity_type, entity_id")
    .eq("recipient_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (scopedMarinaId) {
    query = query.eq("marina_id", scopedMarinaId);
  }

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Notification[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;

  return { items, nextCursor };
}

/** Cached bell payload — accurate unread count + recent list in one server round-trip. */
export async function getNotificationsBell(
  marinaId: string,
  limit = 10
): Promise<NotificationsBellData> {
  return getCachedNotificationsBell(marinaId, limit);
}

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", session.userId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  return { success: true, data: undefined };
}

export async function markAllNotificationsRead(
  marinaId?: string
): Promise<ActionResult> {
  const session = await requireSession();
  const scopedMarinaId = marinaId ?? session.activeMarina?.id;
  if (!scopedMarinaId) {
    return { success: false, error: "No active marina" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", session.userId)
    .is("read_at", null)
    .eq("marina_id", scopedMarinaId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  return { success: true, data: undefined };
}

export async function markAllNotificationsReadForActiveMarina(): Promise<void> {
  const session = await requireSession();
  await markAllNotificationsRead(session.activeMarina?.id);
}
