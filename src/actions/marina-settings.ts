"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { marinaSettingsSchema } from "@/lib/validations/marina-settings.schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { MarinaSettings } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function ensureMarinaSettings(marinaId: string): Promise<MarinaSettings> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageSettings);

  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("marina_settings")
    .select("marina_id, booking_window_days, cancellation_policy, allow_same_day, timezone, currency, tax_rate, business_hours")
    .eq("marina_id", marinaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing) return existing as unknown as MarinaSettings;

  const admin = createAdminClient();
  const { data: marina } = await admin
    .from("marinas")
    .select("timezone")
    .eq("id", marinaId)
    .single();

  const { data: created, error: insertError } = await admin
    .from("marina_settings")
    .insert({
      marina_id: marinaId,
      timezone: marina?.timezone ?? "Asia/Kolkata",
      currency: "INR",
      tax_rate: 0.18,
      deposit_pct: 25,
      segmentation: { vip_min_bookings: 5, vip_min_spend: 50000 },
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);
  return created as MarinaSettings;
}

export async function getMarinaSettings(marinaId: string): Promise<MarinaSettings | null> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marina_settings")
    .select("marina_id, booking_window_days, cancellation_policy, allow_same_day, timezone, currency, tax_rate, business_hours")
    .eq("marina_id", marinaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as MarinaSettings | null;
}

export async function updateMarinaSettings(
  marinaId: string,
  values: unknown
): Promise<ActionResult<MarinaSettings>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageSettings);

  const parsed = marinaSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marina_settings")
    .update({
      ...parsed.data,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("marina_id", marinaId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await writeAuditLog({
    marinaId,
    action: "marina_settings.updated",
    entityType: "marina_settings",
    summary: "Marina settings updated",
    entityId: marinaId,
    visibility: "owner_only",
  });

  revalidatePath("/dashboard/settings");
  return { success: true, data: data as MarinaSettings };
}
