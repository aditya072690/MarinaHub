"use server";

import { clearAuthCookies } from "@/lib/auth/intent";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearAuthCookies();
  revalidatePath("/", "layout");
  redirect("/");
}
