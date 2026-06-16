import { formatCurrency } from "@/lib/currency/format";
import { getBookingAddonsPublic } from "@/actions/addons";
import { getMarinaContactInfo } from "@/actions/marina-contact";
import { MarinaContactCard } from "@/components/consumer/marina-contact-card";
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { WeatherSection } from "@/components/weather/weather-section";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_TIMEZONE,
  formatInMarinaTimezone,
  getBookingDateInMarinaTimezone,
} from "@/lib/timezone";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Ticket } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const headersList = await headers();
  const ip = getClientIpFromHeaders(headersList);
  const { success: allowed } = await checkRateLimit(`itinerary:${ip}`, 30, 60_000);
  if (!allowed) notFound();

  const supabase = await createClient();

  const { data: marina } = await supabase
    .from("marinas")
    .select("id, name, slug, timezone, lat, lng")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marina) notFound();

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("*, boats(name, image_urls)")
    .eq("ticket_token", token)
    .eq("marina_id", marina.id)
    .single();

  if (!booking) notFound();

  const [addons, contactInfo] = await Promise.all([
    getBookingAddonsPublic(booking.id, marina.id),
    getMarinaContactInfo(marina.id),
  ]);

  const boat = booking.boats as { name: string; image_urls: string[] };
  const timezone = marina.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Trip Itinerary</h1>
        <p className="text-muted-foreground">{marina.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Trip Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <BookingStatusBadge status={booking.status} consumer />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Boat</span>
            <span className="font-medium">{boat.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>
              {formatInMarinaTimezone(booking.start_at, timezone, "EEE, MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span>
              {formatInMarinaTimezone(booking.start_at, timezone, "h:mm a")} –{" "}
              {formatInMarinaTimezone(booking.end_at, timezone, "h:mm a")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guests</span>
            <span>{booking.guest_count}</span>
          </div>
          {addons.length > 0 && (
            <div className="border-t pt-2">
              <p className="mb-1 text-muted-foreground">Add-ons</p>
              {addons.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.addon_catalog?.name}</span>
                  <span>{formatCurrency(Number(a.total_price))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(booking.total_price))}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <WeatherSection
            marina={{
              id: marina.id,
              lat: marina.lat,
              lng: marina.lng,
              timezone,
            }}
            variant="strip"
            title="Trip Weather"
            highlightDate={getBookingDateInMarinaTimezone(
              booking.start_at,
              timezone
            )}
          />
        </CardContent>
      </Card>

      {contactInfo && (
        <MarinaContactCard
          marina={contactInfo}
          businessHours={
            contactInfo.business_hours as Record<
              string,
              { open?: string; close?: string; closed?: boolean }
            > | null
          }
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/m/${slug}/booking/ticket/${token}`}
          className={cn(buttonVariants(), "inline-flex items-center justify-center gap-2")}
        >
          <Ticket className="h-4 w-4" />
          View Digital Ticket
        </Link>
        <Link
          href={`/m/${slug}`}
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center justify-center")}
        >
          Back to Marina
        </Link>
      </div>
    </div>
  );
}
