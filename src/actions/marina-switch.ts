"use server";

import { assertMarinaAccess } from "@/lib/auth/guards";
import { setActiveMarinaCookie } from "@/lib/auth/cookies";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function switchActiveMarina(marinaId: string) {
  const session = await requireSession();
  assertMarinaAccess(session, marinaId);

  await setActiveMarinaCookie(marinaId);
  revalidatePath("/dashboard", "layout");

  return { success: true as const };
}
