"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageBoats, canViewCustomers } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { waitlistJoinSchema } from "@/lib/validations/marina-settings.schema";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { WaitlistEntry } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function getWaitlistEntries(marinaId: string): Promise<WaitlistEntry[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("id, marina_id, boat_id, customer_id, guest_name, guest_email, guest_phone, desired_start_at, desired_end_at, status, guest_count, created_at, notified_at, expires_at, converted_booking_id")
    .eq("marina_id", marinaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as WaitlistEntry[];
}

export async function joinWaitlist(
  marinaId: string,
  values: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = waitlistJoinSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_waitlist", {
    p_marina_id: marinaId,
    p_boat_id: parsed.data.boat_id,
    p_desired_start: parsed.data.desired_start_at,
    p_desired_end: parsed.data.desired_end_at,
    p_guest_count: parsed.data.guest_count,
    p_guest_name: parsed.data.guest_name,
    p_guest_email: parsed.data.guest_email,
    p_guest_phone: parsed.data.guest_phone,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data as string } };
}

export async function cancelWaitlistEntry(
  marinaId: string,
  entryId: string
): Promise<ActionResult<void>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: "cancelled" })
    .eq("id", entryId)
    .eq("marina_id", marinaId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/waitlist");
  return { success: true, data: undefined };
}

export async function getWaitlistForStaff(marinaId: string) {
  return getWaitlistEntries(marinaId);
}

export async function listWaitlist(marinaId: string) {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canViewCustomers);
  return getWaitlistEntries(marinaId);
}
