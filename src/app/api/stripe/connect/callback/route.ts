import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getAppUrl, isStripeConfigured } from "@/lib/stripe/config";
import { mapAccountToFields, retrieveConnectAccount } from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.redirect(`${getAppUrl()}/dashboard/payments?connect=error`);
  }

  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const marinaId = searchParams.get("marina_id");

    if (!marinaId) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/payments?connect=error`);
    }

    assertActiveMarina(session, marinaId, canManageSettings);

    if (session.activeRole !== "owner") {
      return NextResponse.redirect(`${getAppUrl()}/dashboard?connect=forbidden`);
    }

    const supabase = await createClient();
    const { data: paymentAccount } = await supabase
      .from("marina_payment_accounts")
      .select("*")
      .eq("marina_id", marinaId)
      .maybeSingle();

    if (!paymentAccount?.stripe_account_id) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/payments?connect=error`);
    }

    const account = await retrieveConnectAccount(paymentAccount.stripe_account_id);
    const fields = mapAccountToFields(account, paymentAccount.connected_at);

    await supabase
      .from("marina_payment_accounts")
      .update(fields)
      .eq("marina_id", marinaId);

    const query = fields.stripe_onboarding_complete ? "success" : "pending";
    return NextResponse.redirect(`${getAppUrl()}/dashboard/payments?connect=${query}`);
  } catch {
    return NextResponse.redirect(`${getAppUrl()}/dashboard/payments?connect=error`);
  }
}
