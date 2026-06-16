import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { waitlistJoinSchema } from "@/lib/validations/marina-settings.schema";
import { NextResponse } from "next/server";
import { z } from "zod";

const waitlistApiSchema = waitlistJoinSchema.extend({
  marina_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`waitlist:${ip}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const validated = waitlistApiSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("join_waitlist", {
    p_marina_id: validated.data.marina_id,
    p_boat_id: validated.data.boat_id,
    p_desired_start: validated.data.desired_start_at,
    p_desired_end: validated.data.desired_end_at,
    p_guest_count: validated.data.guest_count,
    p_guest_name: validated.data.guest_name,
    p_guest_email: validated.data.guest_email,
    p_guest_phone: validated.data.guest_phone,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data }, { status: 201 });
}
