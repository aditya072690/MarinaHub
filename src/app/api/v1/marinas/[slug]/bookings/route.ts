import { createPublicBooking } from "@/lib/bookings/create-public-booking";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`booking:${ip}`, 10, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: marina } = await supabase
    .from("marinas")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marina) {
    return NextResponse.json({ error: "Marina not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = await createPublicBooking(
    marina.id,
    body,
    "consumer",
    user?.id ?? null
  );

  if ("error" in result && !("booking" in result)) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      booking: result.booking,
      requiresPayment: result.requiresPayment ?? false,
      checkoutToken: result.checkoutToken,
    },
    { status: 201 }
  );
}
