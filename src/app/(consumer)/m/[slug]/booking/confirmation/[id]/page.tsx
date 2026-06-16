import { getBookingAddonsPublic } from "@/actions/addons";
import { PostBookingAccountCta } from "@/components/consumer/post-booking-account-cta";
import { WeatherSection } from "@/components/weather/weather-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_TIMEZONE,
  formatInMarinaTimezone,
  getBookingDateInMarinaTimezone,
} from "@/lib/timezone";
import { formatCurrency } from "@/lib/currency/format";
import { formatBookingReference, isStripeConfigured } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { confirmBookingFromCheckoutSession } from "@/lib/stripe/webhook-handlers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

/** If webhook is delayed, sync booking from Stripe session on success redirect. */
async function syncPaymentFromSessionIfNeeded(
  bookingId: string,
  marinaId: string,
  sessionId: string | undefined,
  dbPaymentStatus: string
): Promise<boolean> {
  if (dbPaymentStatus === "paid" || !sessionId || !isStripeConfigured()) {
    return dbPaymentStatus === "paid";
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.booking_id !== bookingId) return false;
    if (session.metadata?.marina_id !== marinaId) return false;
    if (session.payment_status !== "paid") return false;

    await confirmBookingFromCheckoutSession(session, `page_sync_${session.id}`);
    return true;
  } catch (err) {
    console.error("[confirmation sync]", err);
    return false;
  }
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug, id } = await params;
  const { session_id: sessionId } = await searchParams;
  const supabase = await createClient();

  const { data: marina } = await supabase
    .from("marinas")
    .select("id, timezone, lat, lng")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marina) notFound();

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("*, boats(name), customers(email)")
    .eq("id", id)
    .eq("marina_id", marina.id)
    .single();

  if (!booking) notFound();

  const isPaidSync = await syncPaymentFromSessionIfNeeded(
    id,
    marina.id,
    sessionId,
    booking.payment_status ?? "unpaid"
  );

  if (isPaidSync && booking.payment_status !== "paid") {
    // Next.js Request Memoization caches the first fetch, so we manually
    // apply the updated status to the booking object after a successful sync.
    booking.payment_status = "paid";
    booking.status = "confirmed";
  }

  const isPaid =
    booking.payment_status === "paid" ||
    booking.status === "confirmed" ||
    booking.status === "checked_in" ||
    booking.status === "checked_out" ||
    booking.status === "completed";

  const ticketToken = booking.ticket_token;

  const [addons] = await Promise.all([getBookingAddonsPublic(id, marina.id)]);

  const timezone = marina.timezone ?? DEFAULT_TIMEZONE;
  const boat = booking.boats as { name: string } | null;
  const customer = booking.customers as { email: string } | null;
  const reference = formatBookingReference(booking.id, booking.created_at);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              isPaid ? "bg-emerald-100" : "bg-amber-100"
            }`}
          >
            <CheckCircle
              className={`h-8 w-8 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}
            />
          </div>
          <CardTitle className="text-2xl">
            {isPaid ? "Booking Confirmed!" : "Booking Reserved"}
          </CardTitle>
          {isPaid && (
            <p className="text-sm font-medium text-emerald-700">Payment Successful</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPaid && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
              Payment pending. Complete checkout to confirm your booking.
            </p>
          )}
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-mono text-xs">{reference}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Boat</span>
              <span>{boat?.name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Date</span>
              <span>
                {formatInMarinaTimezone(booking.start_at, timezone, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Time</span>
              <span>
                {formatInMarinaTimezone(booking.start_at, timezone, "h:mm a")} –{" "}
                {formatInMarinaTimezone(booking.end_at, timezone, "h:mm a")}
              </span>
            </div>
            {Number(booking.base_price) > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Base rental</span>
                <span>{formatCurrency(Number(booking.base_price))}</span>
              </div>
            )}
            {addons.map((a) => (
              <div key={a.id} className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  {a.addon_catalog?.name ?? "Add-on"}
                </span>
                <span>{formatCurrency(Number(a.total_price))}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>{isPaid ? "Total Paid" : "Total Due"}</span>
              <span>{formatCurrency(Number(booking.total_price))}</span>
            </div>
          </div>
          {customer?.email && (
            <p className="text-center text-sm text-muted-foreground">
              A confirmation will be sent to {customer.email}
            </p>
          )}
          {customer?.email && <PostBookingAccountCta email={customer.email} />}
          {ticketToken && isPaid && (
            <>
              <Link
                href={`/m/${slug}/booking/ticket/${ticketToken}`}
                className="block"
              >
                <Button variant="outline" className="w-full">
                  View Digital Ticket
                </Button>
              </Link>
              <Link
                href={`/m/${slug}/booking/itinerary/${ticketToken}`}
                className="block"
              >
                <Button variant="secondary" className="w-full">
                  View Itinerary & Weather
                </Button>
              </Link>
            </>
          )}
          <Link href={`/m/${slug}`} className="block">
            <Button variant="ghost" className="w-full">
              Back to Marina
            </Button>
          </Link>
        </CardContent>
      </Card>

      {isPaid && (
        <WeatherSection
          marina={{
            id: marina.id,
            lat: marina.lat,
            lng: marina.lng,
            timezone: marina.timezone ?? DEFAULT_TIMEZONE,
          }}
          variant="compact"
          title="Expected Weather"
          highlightDate={getBookingDateInMarinaTimezone(booking.start_at, timezone)}
        />
      )}
    </div>
  );
}
