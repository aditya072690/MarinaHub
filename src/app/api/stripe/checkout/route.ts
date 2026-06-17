import { DEFAULT_CURRENCY } from "@/lib/currency/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isStripeConfigured } from "@/lib/stripe/config";
import {
  createBookingCheckoutSession,
  normalizeCheckoutBooking,
  normalizeRelation,
} from "@/lib/stripe/checkout";
import { verifyCheckoutToken } from "@/lib/stripe/checkout-token";
import {
  marinaCanAcceptStripePayments,
  syncMarinaPaymentAccount,
} from "@/lib/stripe/connect";
import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server" },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`stripe-checkout:${ip}`, 10, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: { booking_id?: string; source?: string; checkout_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingId = body.booking_id;
  const checkoutToken = body.checkout_token;
  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
  }

  if (!checkoutToken || typeof checkoutToken !== "string") {
    return NextResponse.json({ error: "checkout_token is required" }, { status: 401 });
  }

  if (!verifyCheckoutToken(bookingId, checkoutToken)) {
    return NextResponse.json({ error: "Invalid or expired checkout token" }, { status: 401 });
  }

  const source = body.source === "widget" ? "widget" : "consumer";

  const supabase = createAdminClient();

  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      id, marina_id, boat_id, status, payment_status, total_price,
      base_price, addons_total, tax_amount, pricing_breakdown,
      boats(name),
      customers(email),
      marinas(slug)
    `
    )
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const booking = normalizeCheckoutBooking(bookingRow);

  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 409 });
  }

  if (!["unpaid", "pending"].includes(booking.payment_status)) {
    return NextResponse.json({ error: "Booking payment already processed" }, { status: 409 });
  }

  // Sync Connect flags from Stripe (fixes stale DB after onboarding)
  const paymentAccount = await syncMarinaPaymentAccount(booking.marina_id);
  const useConnect = marinaCanAcceptStripePayments(paymentAccount);

  if (!useConnect) {
    console.warn(
      `[stripe checkout] Marina ${booking.marina_id} has no active Connect account — using platform checkout (dev only)`
    );
  }

  const { data: addonRows } = await supabase
    .from("booking_addons")
    .select("total_price, addon_catalog(name)")
    .eq("booking_id", bookingId);

  const addons = (addonRows ?? []).map((row) => ({
    total_price: row.total_price,
    addon_catalog: normalizeRelation(
      row.addon_catalog as { name: string } | { name: string }[] | null
    ),
  }));

  const { data: settings } = await supabase
    .from("marina_settings")
    .select("currency")
    .eq("marina_id", booking.marina_id)
    .maybeSingle();

  const currency = settings?.currency ?? DEFAULT_CURRENCY;

  try {
    const session = await createBookingCheckoutSession({
      booking,
      addons,
      connectedAccountId: useConnect ? paymentAccount.stripe_account_id : null,
      platformFeePct: useConnect ? Number(paymentAccount.platform_fee_pct ?? 0.03) : 0,
      source,
      currency,
    });

    await supabase
      .from("bookings")
      .update({
        payment_status: "pending",
        stripe_session_id: session.id,
      })
      .eq("id", bookingId);

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      connectMode: useConnect ? "destination" : "platform",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[stripe checkout]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
