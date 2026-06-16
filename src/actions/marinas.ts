"use server";

import { setActiveMarinaCookie } from "@/lib/auth/cookies";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { marinaSchema } from "@/lib/validations/booking.schema";
import type { ActionResult } from "@/types/api";
import type { Marina } from "@/types/database";
import { revalidatePath } from "next/cache";

function parseMarinaFormData(formData: FormData) {
  const contactEmail = formData.get("contact_email");
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();

  return {
    name: formData.get("name"),
    slug,
    description: formData.get("description") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    contact_email:
      contactEmail && String(contactEmail).trim()
        ? String(contactEmail).trim()
        : undefined,
    contact_phone: formData.get("contact_phone") || undefined,
    timezone: formData.get("timezone") || "America/New_York",
  };
}

export async function createMarinaFormAction(
  _prev: ActionResult<Marina> | null,
  formData: FormData
): Promise<ActionResult<Marina>> {
  return createMarina(formData);
}

export async function createMarina(
  formData: FormData
): Promise<ActionResult<Marina>> {
  try {
    await requireSession();
  } catch {
    return { success: false, error: "You must be logged in to create a marina" };
  }

  const parsed = marinaSchema.safeParse(parseMarinaFormData(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: marinaId, error: rpcError } = await supabase.rpc(
    "create_marina_with_owner",
    {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
      p_description: parsed.data.description ?? null,
      p_city: parsed.data.city ?? null,
      p_state: parsed.data.state ?? null,
      p_contact_email: parsed.data.contact_email ?? null,
      p_contact_phone: parsed.data.contact_phone ?? null,
      p_timezone: parsed.data.timezone,
    }
  );

  if (rpcError) {
    const message = rpcError.message.includes("create_marina_with_owner")
      ? "Database setup incomplete. Please run migration 004_fix_marina_members_rls.sql in Supabase."
      : rpcError.message.includes("duplicate key") || rpcError.message.includes("unique")
        ? "That URL slug is already taken. Please choose a different one."
        : rpcError.message;

    return { success: false, error: message };
  }

  if (!marinaId) {
    return { success: false, error: "Marina was not created. Please try again." };
  }

  const { data: marina, error: fetchError } = await supabase
    .from("marinas")
    .select("id, name, slug, description, address, city, state, zip, phone, email, website, logo_url, is_active, created_at")
    .eq("id", marinaId)
    .single();

  if (fetchError || !marina) {
    return {
      success: false,
      error:
        fetchError?.message ??
        "Marina created but could not be loaded. Try refreshing the page.",
    };
  }

  await setActiveMarinaCookie(marina.id);
  revalidatePath("/dashboard");
  return { success: true, data: marina as unknown as Marina };
}

export async function updateMarinaFormAction(
  marinaId: string,
  formData: FormData
): Promise<void> {
  await updateMarina(marinaId, formData);
}

export async function updateMarina(
  marinaId: string,
  formData: FormData
): Promise<ActionResult<Marina>> {
  const session = await requireSession();
  if (!session.activeMarina || session.activeMarina.id !== marinaId) {
    return { success: false, error: "Unauthorized" };
  }
  if (session.activeRole !== "owner") {
    return { success: false, error: "Only owners can update marina settings" };
  }

  const parsed = marinaSchema.partial().safeParse(parseMarinaFormData(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marinas")
    .update(parsed.data)
    .eq("id", marinaId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true, data };
}
