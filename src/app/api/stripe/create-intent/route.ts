import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { marinaCanAcceptStripePayments, syncMarinaPaymentAccount } from "@/lib/stripe/connect";
import { createPublicBooking } from "@/lib/bookings/create-public-booking";
import { toStripeMinorUnits } from "@/lib/currency/format";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createAdminClient();
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { boatId, startDate, endDate, guestCount = 2 } = body;

    // Fetch boat to get marinaId
    const { data: boat, error: boatError } = await supabase
      .from("boats")
      .select("marina_id")
      .eq("id", boatId)
      .single();

    if (boatError || !boat) {
      return NextResponse.json({ error: "Boat not found" }, { status: 404 });
    }

    // Prepare booking payload
    const bookingPayload = {
      boat_id: boatId,
      start_at: startDate,
      end_at: endDate,
      guest_count: guestCount,
      customer: {
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest',
        email: user.email,
      },
      waiver_accepted: true // Automatically accepting for mobile flow v1
    };

    // 1. Create the booking record first
    const bookingResponse = await createPublicBooking(
      boat.marina_id,
      bookingPayload,
      "consumer",
      user.id
    );

    if (bookingResponse.error || !bookingResponse.booking) {
      return NextResponse.json({ error: bookingResponse.error }, { status: bookingResponse.status });
    }

    const booking = bookingResponse.booking;

    // 2. Setup Stripe Connect logic
    const paymentAccount = await syncMarinaPaymentAccount(boat.marina_id);
    const useConnect = marinaCanAcceptStripePayments(paymentAccount);

    const stripe = getStripe();
    const totalMinor = toStripeMinorUnits(booking.total_price);
    
    // Platform fee calculation (e.g., 3%)
    const platformFeePct = Number(paymentAccount?.platform_fee_pct ?? 0.03);
    const applicationFeeAmount = Math.max(Math.round(totalMinor * platformFeePct), 0);

    // 3. Create the PaymentIntent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalMinor,
      currency: "usd",
      metadata: {
        booking_id: booking.id,
        marina_id: boat.marina_id,
        source: "consumer"
      },
      automatic_payment_methods: { enabled: true },
    };

    if (useConnect && paymentAccount.stripe_account_id) {
      paymentIntentParams.application_fee_amount = applicationFeeAmount;
      paymentIntentParams.transfer_data = {
        destination: paymentAccount.stripe_account_id,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // 4. Save PaymentIntent ID to the booking
    await supabase
      .from("bookings")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      bookingId: booking.id
    });
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[stripe create-intent]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
