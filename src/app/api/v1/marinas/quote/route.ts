import { createAdminClient } from "@/lib/supabase/admin";
import { parsePriceQuote } from "@/lib/pricing/quote";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boatId = searchParams.get("boat_id");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!boatId || !start || !end) {
    return NextResponse.json({ error: "Missing boat_id, start, or end" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("resolve_booking_price", {
    p_boat_id: boatId,
    p_start: start,
    p_end: end,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quote: parsePriceQuote(data) });
}
