import { createAdminClient } from "@/lib/supabase/admin";
import { parseAlternativeBoats } from "@/lib/pricing/quote";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marinaId = searchParams.get("marina_id");
  const boatId = searchParams.get("boat_id");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const guestCount = parseInt(searchParams.get("guest_count") ?? "1", 10);

  if (!marinaId || !boatId || !start || !end) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: available } = await supabase.rpc("is_boat_available", {
    p_boat_id: boatId,
    p_start: start,
    p_end: end,
  });

  const { data: alternativesRaw } = await supabase.rpc("suggest_alternative_boats", {
    p_marina_id: marinaId,
    p_boat_id: boatId,
    p_start: start,
    p_end: end,
    p_guest_count: guestCount,
    p_limit: 5,
  });

  return NextResponse.json({
    available: Boolean(available),
    alternatives: parseAlternativeBoats(alternativesRaw),
  });
}
