"use server";

import { canManageBlocks } from "@/lib/auth/permissions";
import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { AvailabilityBlock } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const blockSchema = z.object({
  boat_id: z.string().uuid().nullable().optional(),
  reason: z.enum(["maintenance", "owner_hold", "weather", "manual", "other"]),
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  title: z.string().max(200).optional(),
  notes: z.string().optional(),
});

export async function getAvailabilityBlocks(
  marinaId: string,
  options?: { startAfter?: string; startBefore?: string }
): Promise<AvailabilityBlock[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  let query = supabase
    .from("availability_blocks")
    .select("id, boat_id, marina_id, start_at, end_at, reason, title, notes, created_by, created_at")
    .eq("marina_id", marinaId)
    .order("start_at");

  if (options?.startAfter) {
    query = query.gte("start_at", options.startAfter);
  }
  if (options?.startBefore) {
    query = query.lt("start_at", options.startBefore);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBlock(
  marinaId: string,
  values: unknown
): Promise<ActionResult<AvailabilityBlock>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBlocks);

  const parsed = blockSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.boat_id) {
    const supabase = await createClient();
    const { data: boat } = await supabase
      .from("boats")
      .select("id")
      .eq("id", parsed.data.boat_id)
      .eq("marina_id", marinaId)
      .maybeSingle();

    if (!boat) {
      return { success: false, error: "Boat not found in this marina" };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_blocks")
    .insert({
      marina_id: marinaId,
      boat_id: parsed.data.boat_id ?? null,
      reason: parsed.data.reason,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      title: parsed.data.title ?? null,
      notes: parsed.data.notes,
      created_by: session.userId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/availability");
  return { success: true, data };
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!canManageBlocks(session.activeRole)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: block } = await supabase
    .from("availability_blocks")
    .select("marina_id")
    .eq("id", blockId)
    .single();

  if (!block) return { success: false, error: "Block not found" };

  try {
    assertActiveMarina(session, block.marina_id, canManageBlocks);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase
    .from("availability_blocks")
    .delete()
    .eq("id", blockId)
    .eq("marina_id", block.marina_id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/calendar");
  return { success: true, data: undefined };
}

export async function checkAvailability(
  boatId: string,
  startAt: string,
  endAt: string
): Promise<boolean> {
  const session = await requireSession();

  const supabase = await createClient();
  const { data: boat } = await supabase
    .from("boats")
    .select("marina_id")
    .eq("id", boatId)
    .single();

  if (!boat) return false;

  assertActiveMarina(session, boat.marina_id);

  const { data } = await supabase.rpc("is_boat_available", {
    p_boat_id: boatId,
    p_start: startAt,
    p_end: endAt,
  });
  return data ?? false;
}
