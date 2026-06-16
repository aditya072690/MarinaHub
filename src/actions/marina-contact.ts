"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { Marina } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const marinaContactSchema = z
  .object({
    contact_email: z.string().email().optional().or(z.literal("")),
    contact_phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().max(2).optional().or(z.literal("")),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine(
    (d) => {
      const hasLat = d.lat != null;
      const hasLng = d.lng != null;
      return hasLat === hasLng;
    },
    { message: "Latitude and longitude must both be set or both empty" }
  );

export async function updateMarinaContact(
  marinaId: string,
  values: unknown
): Promise<ActionResult<Marina>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageSettings);

  const parsed = marinaContactSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marinas")
    .update({
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      address: parsed.data.address?.trim() || null,
      city: parsed.data.city?.trim() || null,
      state: parsed.data.state?.trim() || null,
      zip: parsed.data.zip?.trim() || null,
      country: parsed.data.country?.trim()?.toUpperCase() || "IN",
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
    })
    .eq("id", marinaId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await writeAuditLog({
    marinaId,
    action: "marina.location_updated",
    entityType: "marina",
    entityId: marinaId,
    summary: "Marina contact and location updated",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(`/m/${data.slug}`, "layout");

  return { success: true, data: data as Marina };
}

export async function getMarinaContactInfo(marinaId: string) {
  const supabase = await createClient();

  const [{ data: marina }, { data: settings }] = await Promise.all([
    supabase
      .from("marinas")
      .select(
        "id, name, slug, address, city, state, zip, country, contact_email, contact_phone, lat, lng, display_hours, timezone, updated_at"
      )
      .eq("id", marinaId)
      .single(),
    supabase
      .from("marina_settings")
      .select("business_hours")
      .eq("marina_id", marinaId)
      .maybeSingle(),
  ]);

  if (!marina) return null;

  const displayHours =
    (marina.display_hours as Record<string, unknown> | null) ??
    (settings?.business_hours as Record<string, unknown> | null) ??
    null;

  return { ...marina, business_hours: displayHours };
}
