import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapAccountToFields } from "./connect";
import { getStripe } from "./server";
import { sendBookingConfirmation } from "@/lib/email";
import type Stripe from "stripe";

export async function confirmBookingFromCheckoutSession(
  session: Stripe.Checkout.Session,
  stripeEventId: string
): Promise<boolean> {
  const bookingId = session.metadata?.booking_id;
  const marinaId = session.metadata?.marina_id;

  if (!bookingId || !marinaId) {
    return false;
  }

  if (session.payment_status !== "paid") {
    return false;
  }

  const amountCents = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  let platformFeeCents = 0;
  if (paymentIntentId) {
    try {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      platformFeeCents = intent.application_fee_amount ?? 0;
    } catch {
      platformFeeCents = 0;
    }
  }

  const supabase = createAdminClient();
  const currency = (session.currency ?? "inr").toLowerCase();
  const { error } = await supabase.rpc("confirm_booking_payment", {
    p_booking_id: bookingId,
    p_marina_id: marinaId,
    p_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_amount_cents: amountCents,
    p_platform_fee_cents: platformFeeCents,
    p_stripe_event_id: stripeEventId,
    p_stripe_charge_id: null,
    p_currency: currency,
  });

  if (error) {
    console.error("[stripe confirm]", error.message);
    return false;
  }

  // Trigger transactional email
  await sendBookingConfirmation(bookingId).catch((err) => {
    console.error("[stripe confirm] failed to send email:", err);
  });

  return true;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const ok = await confirmBookingFromCheckoutSession(session, eventId);
  if (!ok && session.metadata?.booking_id) {
    console.error("[stripe webhook] checkout.session.completed could not confirm booking");
  }
}

export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("bookings")
    .update({ status: "cancelled", payment_status: "failed" })
    .eq("stripe_session_id", session.id)
    .eq("status", "pending")
    .in("payment_status", ["unpaid", "pending"]);
}

export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const supabase = createAdminClient();
  const marinaId = account.metadata?.marina_id;

  const accountQuery = marinaId
    ? supabase
        .from("marina_payment_accounts")
        .select("marina_id, connected_at")
        .eq("marina_id", marinaId)
    : supabase
        .from("marina_payment_accounts")
        .select("marina_id, connected_at")
        .eq("stripe_account_id", account.id);

  const { data: existing } = await accountQuery.maybeSingle();
  if (!existing) return;

  const fields = mapAccountToFields(account, existing.connected_at);

  await supabase
    .from("marina_payment_accounts")
    .update({
      ...fields,
      stripe_account_id: account.id,
    })
    .eq("marina_id", existing.marina_id);
}

export async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const supabase = createAdminClient();

  const [{ data: existing }, { data: booking }] = await Promise.all([
    supabase
      .from("payment_transactions")
      .select("id")
      .eq("stripe_event_id", eventId)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, marina_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle()
  ]);

  if (existing || !booking) return;

  await supabase
    .from("bookings")
    .update({ payment_status: "refunded" })
    .eq("id", booking.id);

  const refundAmount = charge.amount_refunded ?? 0;
  await supabase.from("payment_transactions").insert({
    marina_id: booking.marina_id,
    booking_id: booking.id,
    type: "refund",
    status: "succeeded",
    currency: (charge.currency ?? "inr").toLowerCase(),
    amount_cents: refundAmount,
    platform_fee_cents: 0,
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: charge.id,
    stripe_event_id: eventId,
    description: `Refund for booking ${booking.id.slice(0, 8)}`,
  });
}

export async function handlePayoutPaid(
  payout: Stripe.Payout,
  eventId: string,
  connectedAccountId?: string | null
): Promise<void> {
  if (!connectedAccountId) return;

  const supabase = createAdminClient();

  const [{ data: account }, { data: existing }] = await Promise.all([
    supabase
      .from("marina_payment_accounts")
      .select("marina_id")
      .eq("stripe_account_id", connectedAccountId)
      .maybeSingle(),
    supabase
      .from("payment_transactions")
      .select("id")
      .eq("stripe_event_id", eventId)
      .maybeSingle()
  ]);

  if (!account || existing) return;

  await supabase.from("payment_transactions").insert({
    marina_id: account.marina_id,
    type: "payout",
    status: "succeeded",
    amount_cents: payout.amount,
    platform_fee_cents: 0,
    stripe_payout_id: payout.id,
    stripe_event_id: eventId,
    description: `Payout ${payout.id}`,
  });
}

export async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        event.id
      );
      break;
    case "checkout.session.expired":
      await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
      break;
    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
      break;
    case "payout.paid":
      await handlePayoutPaid(
        event.data.object as Stripe.Payout,
        event.id,
        event.account
      );
      break;
    default:
      break;
  }
}
