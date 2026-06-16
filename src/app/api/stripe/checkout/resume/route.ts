import { DEFAULT_CURRENCY } from "@/lib/currency/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isStripeConfigured } from "@/lib/stripe/config";
import {
  createBookingCheckoutSession,
  normalizeCheckoutBooking,
  normalizeRelation,
} from "@/lib/stripe/checkout";
import {
  marinaCanAcceptStripePayments,
  syncMarinaPaymentAccount,
} from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

/** Authenticated consumers can resume payment for their own unpaid pending booking. */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`stripe-checkout-resume:${ip}`, 10, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to complete payment" }, { status: 401 });
  }

  let body: { booking_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingId = body.booking_id;
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const { data: customerIds } = await supabase
    .from("customers")
    .select("id")
    .or(`user_id.eq.${user.id}${profile?.email ? `,email.eq.${profile.email}` : ""}`);

  const ids = (customerIds ?? []).map((c) => c.id);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: bookingRow, error: bookingError } = await admin
    .from("bookings")
    .select(
      `
      id, marina_id, boat_id, status, payment_status, total_price, customer_id,
      base_price, addons_total, tax_amount, pricing_breakdown,
      boats(name),
      customers(email),
      marinas(slug)
    `
    )
    .eq("id", bookingId)
    .in("customer_id", ids)
    .single();

  if (bookingError || !bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const booking = normalizeCheckoutBooking(bookingRow);

  if (booking.status !== "pending" || !["unpaid", "pending"].includes(booking.payment_status)) {
    return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 409 });
  }

  const paymentAccount = await syncMarinaPaymentAccount(booking.marina_id);
  const useConnect = marinaCanAcceptStripePayments(paymentAccount);

  if (!useConnect && isProduction) {
    return NextResponse.json(
      { error: "Online payment is not available for this marina yet." },
      { status: 422 }
    );
  }

  const { data: addonRows } = await admin
    .from("booking_addons")
    .select("total_price, addon_catalog(name)")
    .eq("booking_id", bookingId);

  const addons = (addonRows ?? []).map((row) => ({
    total_price: row.total_price,
    addon_catalog: normalizeRelation(
      row.addon_catalog as { name: string } | { name: string }[] | null
    ),
  }));

  const { data: settings } = await admin
    .from("marina_settings")
    .select("currency")
    .eq("marina_id", booking.marina_id)
    .maybeSingle();

  const currency = settings?.currency ?? DEFAULT_CURRENCY;

  try {
    const session = await createBookingCheckoutSession({
      booking,
      addons,
      connectedAccountId: useConnect ? paymentAccount!.stripe_account_id : null,
      platformFeePct: useConnect ? Number(paymentAccount!.platform_fee_pct ?? 0.03) : 0,
      source: "consumer",
      currency,
    });

    await admin
      .from("bookings")
      .update({ payment_status: "pending", stripe_session_id: session.id })
      .eq("id", bookingId);

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
