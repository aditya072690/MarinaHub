"use server";

import { canManageWidget } from "@/lib/auth/permissions";
import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function generateWidgetKey(
  marinaId: string
): Promise<ActionResult<{ apiKey: string }>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageWidget);

  const apiKey = `mh_${randomBytes(24).toString("hex")}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  const supabase = await createClient();
  const { error } = await supabase.from("widget_configs").upsert(
    {
      marina_id: marinaId,
      api_key_hash: apiKeyHash,
      is_enabled: true,
    },
    { onConflict: "marina_id" }
  );

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/widget");
  return { success: true, data: { apiKey } };
}

export async function updateWidgetConfig(
  marinaId: string,
  values: { allowed_origins?: string[]; theme?: Record<string, unknown>; is_enabled?: boolean }
): Promise<ActionResult> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageWidget);

  const supabase = await createClient();
  const { error } = await supabase
    .from("widget_configs")
    .update(values)
    .eq("marina_id", marinaId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/widget");
  return { success: true, data: undefined };
}

export async function uploadWidgetLogo(
  marinaId: string,
  formData: FormData
): Promise<ActionResult<string>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageWidget);

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { success: false, error: "Image must be under 5MB" };
  }

  const supabase = await createClient();
  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${marinaId}/widget-logo/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("boats")
    .upload(path, file, { upsert: true });

  if (uploadError) return { success: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("boats").getPublicUrl(path);

  return { success: true, data: publicUrl };
}
