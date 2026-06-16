"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageBlocks } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { maintenanceLogSchema } from "@/lib/validations/maintenance.schema";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { MaintenanceLog } from "@/types/database";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

export async function getMaintenanceLogs(
  marinaId: string,
  boatId?: string
): Promise<MaintenanceLog[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  let query = supabase
    .from("maintenance_logs")
    .select("*, boats(*)")
    .eq("marina_id", marinaId)
    .order("scheduled_at", { ascending: false });

  if (boatId) {
    query = query.eq("boat_id", boatId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MaintenanceLog[];
}

export async function createMaintenanceLog(
  marinaId: string,
  values: unknown
): Promise<ActionResult<MaintenanceLog>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBlocks);

  const parsed = maintenanceLogSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .insert({
      marina_id: marinaId,
      boat_id: parsed.data.boat_id,
      status: parsed.data.status,
      scheduled_at: parsed.data.scheduled_at,
      completed_at: parsed.data.completed_at ?? null,
      notes: parsed.data.notes ?? null,
      created_by: session.userId,
    })
    .select("*, boats(*)")
    .single();

  if (error) return { success: false, error: error.message };

  if (
    parsed.data.block_calendar &&
    (parsed.data.status === "scheduled" || parsed.data.status === "in_progress")
  ) {
    const start = new Date(parsed.data.scheduled_at);
    const end = addDays(start, 1);
    await supabase.from("availability_blocks").insert({
      marina_id: marinaId,
      boat_id: parsed.data.boat_id,
      reason: "maintenance",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      title: "Scheduled maintenance",
      notes: parsed.data.notes ?? null,
      created_by: session.userId,
    });
  }

  revalidatePath("/dashboard/maintenance");
  revalidatePath("/dashboard/calendar");
  return { success: true, data: data as MaintenanceLog };
}

export async function updateMaintenanceLog(
  logId: string,
  values: unknown
): Promise<ActionResult<MaintenanceLog>> {
  const session = await requireSession();
  const parsed = maintenanceLogSchema.partial().safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("maintenance_logs")
    .select("marina_id")
    .eq("id", logId)
    .single();

  if (!existing) return { success: false, error: "Log not found" };
  assertActiveMarina(session, existing.marina_id, canManageBlocks);

  const { data, error } = await supabase
    .from("maintenance_logs")
    .update(parsed.data)
    .eq("id", logId)
    .select("*, boats(*)")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/maintenance");
  return { success: true, data: data as MaintenanceLog };
}

export async function deleteMaintenanceLog(logId: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("maintenance_logs")
    .select("marina_id")
    .eq("id", logId)
    .single();

  if (!existing) return { success: false, error: "Log not found" };
  assertActiveMarina(session, existing.marina_id, canManageBlocks);

  const { error } = await supabase.from("maintenance_logs").delete().eq("id", logId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/maintenance");
  return { success: true, data: undefined };
}
