"use server";

import { canManageBoats } from "@/lib/auth/permissions";
import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { boatSchema } from "@/lib/validations/boat.schema";
import type { ActionResult } from "@/types/api";
import type { Boat } from "@/types/database";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const BOAT_LIST_SELECT =
  "id, marina_id, name, boat_type, capacity, hourly_rate, daily_rate, status, sort_order, min_booking_hours, image_urls, description, amenities, metadata, created_at, updated_at";

export async function getBoats(marinaId: string): Promise<Boat[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boats")
    .select(BOAT_LIST_SELECT)
    .eq("marina_id", marinaId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBoat(
  marinaId: string,
  values: unknown
): Promise<ActionResult<Boat>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const parsed = boatSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boats")
    .insert({ ...parsed.data, marina_id: marinaId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/boats");
  return { success: true, data };
}

export async function updateBoat(
  boatId: string,
  values: unknown
): Promise<ActionResult<Boat>> {
  const session = await requireSession();
  if (!canManageBoats(session.activeRole)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("boats")
    .select("marina_id")
    .eq("id", boatId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Boat not found" };
  }

  try {
    assertActiveMarina(session, existing.marina_id, canManageBoats);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const parsed = boatSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data, error } = await supabase
    .from("boats")
    .update(parsed.data)
    .eq("id", boatId)
    .eq("marina_id", existing.marina_id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/boats");
  return { success: true, data };
}

export async function deleteBoat(boatId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!canManageBoats(session.activeRole)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("boats")
    .select("marina_id")
    .eq("id", boatId)
    .single();

  if (!existing) return { success: false, error: "Boat not found" };

  try {
    assertActiveMarina(session, existing.marina_id, canManageBoats);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase
    .from("boats")
    .delete()
    .eq("id", boatId)
    .eq("marina_id", existing.marina_id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/boats");
  return { success: true, data: undefined };
}

export async function uploadBoatImage(
  marinaId: string,
  boatId: string,
  formData: FormData
): Promise<ActionResult<string>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageBoats);

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { success: false, error: "Image must be under 5MB" };
  }

  const supabase = await createClient();

  const { data: boat } = await supabase
    .from("boats")
    .select("marina_id")
    .eq("id", boatId)
    .eq("marina_id", marinaId)
    .single();

  if (!boat) return { success: false, error: "Boat not found" };

  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${marinaId}/${boatId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("boats")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { success: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("boats").getPublicUrl(path);

  const { data: boatRow } = await supabase
    .from("boats")
    .select("image_urls")
    .eq("id", boatId)
    .single();

  const imageUrls = [...(boatRow?.image_urls ?? []), publicUrl];

  await supabase.from("boats").update({ image_urls: imageUrls }).eq("id", boatId);

  revalidatePath("/dashboard/boats");
  return { success: true, data: publicUrl };
}
