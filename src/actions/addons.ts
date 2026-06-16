"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/api";
import type { AddonCatalogItem } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const addonSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export async function getDashboardAddonCatalog(
  marinaId: string,
  activeOnly = false
): Promise<AddonCatalogItem[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);
  return getAddonCatalog(marinaId, activeOnly);
}

export async function getAddonCatalog(
  marinaId: string,
  activeOnly = false
): Promise<AddonCatalogItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("addon_catalog")
    .select("id, marina_id, name, slug, description, price, is_active, sort_order")
    .eq("marina_id", marinaId)
    .order("sort_order");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AddonCatalogItem[];
}

export async function getPublicAddonCatalog(
  marinaId: string
): Promise<AddonCatalogItem[]> {
  const items = await getAddonCatalog(marinaId, true);
  if (items.length === 0) {
    await seedDefaultAddons(marinaId);
    return getAddonCatalog(marinaId, true);
  }
  return items;
}

export async function upsertAddonCatalogItem(
  marinaId: string,
  values: unknown,
  id?: string
): Promise<ActionResult<AddonCatalogItem>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageSettings);

  const parsed = addonSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const payload = {
    marina_id: marinaId,
    ...parsed.data,
    is_active: parsed.data.is_active ?? true,
    sort_order: parsed.data.sort_order ?? 0,
  };

  if (id) {
    const { data, error } = await supabase
      .from("addon_catalog")
      .update(payload)
      .eq("id", id)
      .eq("marina_id", marinaId)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/settings");
    return { success: true, data: data as AddonCatalogItem };
  }

  const { data, error } = await supabase
    .from("addon_catalog")
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true, data: data as AddonCatalogItem };
}

export async function seedDefaultAddons(marinaId: string): Promise<void> {
  const supabase = createAdminClient();
  const defaults = [
    { slug: "tube_rental", name: "Tube Rental", price: 45, sort_order: 1 },
    { slug: "captain_service", name: "Captain Service", price: 150, sort_order: 2 },
    { slug: "fuel_package", name: "Fuel Package", price: 75, sort_order: 3 },
    { slug: "cooler", name: "Cooler", price: 25, sort_order: 4 },
  ];

  const payload = defaults.map((item) => ({
    marina_id: marinaId,
    ...item,
    is_active: true,
  }));
  await supabase.from("addon_catalog").upsert(payload, { onConflict: "marina_id,slug" });
}

export async function getBookingAddons(bookingId: string) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("marina_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) throw new Error("Booking not found");
  assertActiveMarina(session, booking.marina_id);

  const { data, error } = await supabase
    .from("booking_addons")
    .select("*, addon_catalog(*)")
    .eq("booking_id", bookingId)
    .eq("marina_id", booking.marina_id);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Public confirmation/ticket pages — bypass RLS for line-item display. */
export async function getBookingAddonsPublic(bookingId: string, marinaId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("booking_addons")
    .select("*, addon_catalog(*)")
    .eq("booking_id", bookingId)
    .eq("marina_id", marinaId);

  if (error) throw new Error(error.message);
  return data ?? [];
}
