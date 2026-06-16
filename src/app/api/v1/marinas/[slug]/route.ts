import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`marina:${ip}`, 120, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { slug } = await params;
  const supabase = await createClient();

  const { data: marina, error } = await supabase
    .from("marinas")
    .select("id, name, slug, description, address, city, state, zip, phone, email, website, logo_url, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !marina) {
    return NextResponse.json({ error: "Marina not found" }, { status: 404 });
  }

  const { data: boats } = await supabase
    .from("boats")
    .select("id, name, slug, description, address, city, state, zip, phone, email, website, logo_url, is_active, created_at")
    .eq("marina_id", marina.id)
    .eq("status", "active")
    .order("sort_order");

  return NextResponse.json({ marina, boats: boats ?? [] });
}
