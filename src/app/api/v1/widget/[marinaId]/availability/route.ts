import { fetchBoatAvailability } from "@/lib/availability/fetch-availability";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateWidgetApiKey } from "@/lib/widget/validate-api-key";
import { availabilityQuerySchema, marinaIdParamSchema } from "@/lib/validations/api.schema";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marinaId: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`widget-avail:${ip}`, 60, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { marinaId } = await params;
  const idParsed = marinaIdParamSchema.safeParse({ marinaId });
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid marina ID" }, { status: 400 });
  }

  const auth = await validateWidgetApiKey(
    marinaId,
    request.headers.get("x-widget-key"),
    request
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: boat } = await admin
    .from("boats")
    .select("id")
    .eq("id", boatId)
    .eq("marina_id", marinaId)
    .eq("status", "active")
    .maybeSingle();

  if (!boat) {
    return NextResponse.json({ error: "Boat not found" }, { status: 404 });
  }

  try {
    const availability = await fetchBoatAvailability(marinaId, boatId, start, end);
    return NextResponse.json(availability);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Availability check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
