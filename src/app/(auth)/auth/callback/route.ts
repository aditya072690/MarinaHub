import { linkCustomerRecords } from "@/lib/auth/consumer-session";
import { parseAuthIntent, setAuthIntent } from "@/lib/auth/intent";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intentParam = searchParams.get("intent");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const intent = parseAuthIntent(intentParam ?? undefined) ?? "consumer";
      await setAuthIntent(intent);

      if (user?.email && intent === "consumer") {
        await linkCustomerRecords(user.id, user.email);
      }

      const redirectTo =
        intent === "consumer"
          ? `${origin}/account`
          : `${origin}/dashboard`;

      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
