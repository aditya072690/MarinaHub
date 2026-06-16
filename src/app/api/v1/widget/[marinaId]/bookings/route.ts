import { createPublicBooking } from "@/lib/bookings/create-public-booking";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateWidgetApiKey } from "@/lib/widget/validate-api-key";
import { marinaIdParamSchema } from "@/lib/validations/api.schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ marinaId: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`widget-booking:${ip}`, 10, 60_000);
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

  const body = await request.json();
  const result = await createPublicBooking(marinaId, body, "widget");

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
