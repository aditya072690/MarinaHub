"use server";

import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { Boat, Favorite, Marina } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface FavoriteWithBoat extends Favorite {
  boats: Boat & { marinas: Pick<Marina, "id" | "name" | "slug"> };
}

export async function getUserFavorites(): Promise<FavoriteWithBoat[]> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select("*, boats(*, marinas(id, name, slug, city, state))")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FavoriteWithBoat[];
}

export async function getFavoriteBoatIds(): Promise<string[]> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("favorites")
    .select("boat_id")
    .eq("user_id", session.userId);

  return (data ?? []).map((f) => f.boat_id);
}

export async function toggleFavorite(
  boatId: string,
  marinaId: string
): Promise<ActionResult<{ favorited: boolean }>> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", session.userId)
    .eq("boat_id", boatId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/account/favorites");
    return { success: true, data: { favorited: false } };
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: session.userId,
    boat_id: boatId,
    marina_id: marinaId,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/account/favorites");
  return { success: true, data: { favorited: true } };
}
