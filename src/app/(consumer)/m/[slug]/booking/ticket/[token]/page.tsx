import { getBookingAddonsPublic } from "@/actions/addons";
import { DigitalTicket } from "@/components/consumer/digital-ticket";
import { WeatherSection } from "@/components/weather/weather-section";
import { Card, CardContent } from "@/components/ui/card";
import { buildTicketUrl, getAppBaseUrl } from "@/lib/tickets/qr-payload";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";
import {
  DEFAULT_TIMEZONE,
  getBookingDateInMarinaTimezone,
} from "@/lib/timezone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const headersList = await headers();
  const ip = getClientIpFromHeaders(headersList);
  const { success: allowed } = await checkRateLimit(`ticket:${ip}`, 30, 60_000);
  if (!allowed) notFound();

  const supabase = await createClient();

  const { data: marina } = await supabase
    .from("marinas")
    .select("id, name, slug, logo_url, timezone, lat, lng")
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

  const addons = await getBookingAddonsPublic(booking.id, marina.id);
  const boat = booking.boats as { name: string; image_urls: string[] };
  const ticketUrl = buildTicketUrl(getAppBaseUrl(), slug, token);
  const timezone = marina.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="min-h-screen space-y-6 bg-slate-100 px-4 py-8 print:bg-white">
      <DigitalTicket
        booking={booking}
        marina={marina}
        boat={boat}
        ticketUrl={ticketUrl}
        addons={addons.map((a) => ({
          name: a.addon_catalog?.name ?? "Add-on",
          price: Number(a.total_price),
        }))}
      />
      <Card className="mx-auto max-w-lg print:hidden">
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
    </div>
  );
}
