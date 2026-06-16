import { fetchBoatAvailability } from "@/lib/availability/fetch-availability";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { availabilityQuerySchema } from "@/lib/validations/api.schema";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`availability:${ip}`, 60, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(request.url);

  const parsed = availabilityQuerySchema.safeParse({
    boat_id: searchParams.get("boat_id"),
    start: searchParams.get("start"),
    end: searchParams.get("end"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid parameters" },
      { status: 400 }
    );
  }

  const { boat_id: boatId, start, end } = parsed.data;

  const supabase = await createClient();
  const { data: marina } = await supabase
    .from("marinas")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marina) {
    return NextResponse.json({ error: "Marina not found" }, { status: 404 });
  }

  const { data: boat } = await supabase
    .from("boats")
    .select("id")
    .eq("id", boatId)
    .eq("marina_id", marina.id)
    .eq("status", "active")
    .maybeSingle();

  if (!boat) {
    return NextResponse.json({ error: "Boat not found" }, { status: 404 });
  }

  try {
    const availability = await fetchBoatAvailability(marina.id, boatId, start, end);
    return NextResponse.json(availability);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Availability check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
