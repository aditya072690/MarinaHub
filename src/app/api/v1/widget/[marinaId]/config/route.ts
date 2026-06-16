import { createAdminClient } from "@/lib/supabase/admin";
import { validateWidgetApiKey } from "@/lib/widget/validate-api-key";
import { marinaIdParamSchema } from "@/lib/validations/api.schema";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marinaId: string }> }
) {
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

  const admin = createAdminClient();

  const [{ data: marina }, { data: boats }] = await Promise.all([
    admin.from("marinas").select("*").eq("id", marinaId).eq("is_active", true).single(),
    admin
      .from("boats")
      .select("*")
      .eq("marina_id", marinaId)
      .eq("status", "active")
      .order("sort_order"),
  ]);

  if (!marina) {
    return NextResponse.json({ error: "Marina not found" }, { status: 404 });
  }

  return NextResponse.json({
    theme: auth.config.theme,
    marina,
    boats: boats ?? [],
  });
}
