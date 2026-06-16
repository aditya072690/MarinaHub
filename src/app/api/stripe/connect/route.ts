import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getAppUrl, isStripeConfigured } from "@/lib/stripe/config";
import {
  createAccountOnboardingLink,
  createExpressAccount,
} from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server" },
      { status: 503 }
    );
  }

  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const marinaId =
      typeof body.marinaId === "string" ? body.marinaId : session.activeMarina?.id;

    if (!marinaId) {
      return NextResponse.json({ error: "No active marina" }, { status: 400 });
    }

    assertActiveMarina(session, marinaId, canManageSettings);

    if (session.activeRole !== "owner") {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    const supabase = await createClient();

    const [{ data: marina }, { data: paymentAccount }] = await Promise.all([
      supabase.from("marinas").select("id, slug, contact_email").eq("id", marinaId).single(),
      supabase
        .from("marina_payment_accounts")
        .select("id, marina_id, stripe_account_id, stripe_onboarding_complete, connected_at, platform_fee_pct")
        .eq("marina_id", marinaId)
        .maybeSingle(),
    ]);

    if (!marina) {
      return NextResponse.json({ error: "Marina not found" }, { status: 404 });
    }

    let stripeAccountId = paymentAccount?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      const account = await createExpressAccount({
        email: marina.contact_email ?? session.email,
        marinaId: marina.id,
        marinaSlug: marina.slug,
      });
      stripeAccountId = account.id;

      if (paymentAccount) {
        await supabase
          .from("marina_payment_accounts")
          .update({
            stripe_account_id: stripeAccountId,
            stripe_status: "pending",
          })
          .eq("marina_id", marinaId);
      } else {
        await supabase.from("marina_payment_accounts").insert({
          marina_id: marinaId,
          stripe_account_id: stripeAccountId,
          stripe_status: "pending",
        });
      }
    }

    const appUrl = getAppUrl();
    const onboardingUrl = await createAccountOnboardingLink({
      accountId: stripeAccountId,
      refreshUrl: `${appUrl}/dashboard/payments?connect=refresh`,
      returnUrl: `${appUrl}/api/stripe/connect/callback?marina_id=${marinaId}`,
    });

    return NextResponse.json({ url: onboardingUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connect failed";
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
