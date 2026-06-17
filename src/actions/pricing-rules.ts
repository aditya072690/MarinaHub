"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageBoats } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { pricingRuleSchema } from "@/lib/validations/marina-settings.schema";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { MarinaHoliday, PricingRule } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function getPricingRules(
  marinaId: string,
  boatId?: string | null
): Promise<PricingRule[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  let query = supabase
    .from("pricing_rules")
    .select("id, marina_id, boat_id, rule_type, priority, hourly_rate, daily_rate, rate_multiplier, peak_start, peak_end, holiday_date, holiday_name, is_active")
    .eq("marina_id", marinaId)
    .order("rule_type");

  if (boatId === null) {
    query = query.is("boat_id", null);
  } else if (boatId) {
    query = query.eq("boat_id", boatId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PricingRule[];
}

export async function upsertPricingRule(
  marinaId: string,
  values: unknown,
  ruleId?: string
): Promise<ActionResult<PricingRule>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const parsed = pricingRuleSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    marina_id: marinaId,
    updated_by: session.userId,
  };

  if (ruleId) {
    const { data, error } = await supabase
      .from("pricing_rules")
      .update(payload)
      .eq("id", ruleId)
      .eq("marina_id", marinaId)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/settings");
    return { success: true, data: data as unknown as PricingRule };
  }

  const { data, error } = await supabase
    .from("pricing_rules")
    .insert({ ...payload, created_by: session.userId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings/pricing");
  return { success: true, data: data as unknown as PricingRule };
}

export async function deletePricingRule(
  marinaId: string,
  ruleId: string
): Promise<ActionResult<void>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const supabase = await createClient();
  const { error } = await supabase
    .from("pricing_rules")
    .delete()
    .eq("id", ruleId)
    .eq("marina_id", marinaId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true, data: undefined };
}

export async function getMarinaHolidays(marinaId: string): Promise<MarinaHoliday[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marina_holidays")
    .select("id, marina_id, date, name, is_recurring, created_at")
    .eq("marina_id", marinaId)
    .order("date");

  if (error) throw new Error(error.message);
  return (data ?? []) as MarinaHoliday[];
}

export async function addMarinaHoliday(
  marinaId: string,
  date: string,
  name: string,
  isRecurring = false
): Promise<ActionResult<MarinaHoliday>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marina_holidays")
    .insert({ marina_id: marinaId, date, name, is_recurring: isRecurring })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true, data: data as MarinaHoliday };
}

export async function deleteMarinaHoliday(
  marinaId: string,
  holidayId: string
): Promise<ActionResult<void>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const supabase = await createClient();
  const { error } = await supabase
    .from("marina_holidays")
    .delete()
    .eq("id", holidayId)
    .eq("marina_id", marinaId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true, data: undefined };
}

export async function getBookingQuote(
  boatId: string,
  startAt: string,
  endAt: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_booking_price", {
    p_boat_id: boatId,
    p_start: startAt,
    p_end: endAt,
  });

  if (error) throw new Error(error.message);
  return data;
}
