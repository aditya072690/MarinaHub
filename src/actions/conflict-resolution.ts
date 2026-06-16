"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { parseAlternativeBoats } from "@/lib/pricing/quote";
import { createClient } from "@/lib/supabase/server";
import type { AlternativeBoat } from "@/types/database";

export async function suggestAlternativeBoats(
  marinaId: string,
  boatId: string,
  startAt: string,
  endAt: string,
  guestCount = 1,
  limit = 5
): Promise<AlternativeBoat[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("suggest_alternative_boats", {
    p_marina_id: marinaId,
    p_boat_id: boatId,
    p_start: startAt,
    p_end: endAt,
    p_guest_count: guestCount,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  return parseAlternativeBoats(data);
}
