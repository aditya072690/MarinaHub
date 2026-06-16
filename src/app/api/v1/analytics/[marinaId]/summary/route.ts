import { getAnalyticsSummary } from "@/actions/analytics";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marinaId: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`analytics:${ip}`, 30, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { marinaId } = await params;
    const summary = await getAnalyticsSummary(marinaId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
