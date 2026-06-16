import { formatCurrency } from "@/lib/currency/format";
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { QrCode } from "@/components/shared/qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import { buildTicketUrl, getAppBaseUrl } from "@/lib/tickets/qr-payload";
import type { BookingStatus } from "@/types/database";
import Image from "next/image";

export function DigitalTicket({
  booking,
  marina,
  boat,
  ticketUrl,
  addons = [],
}: {
  booking: {
    id: string;
    status: BookingStatus;
    start_at: string;
    end_at: string;
    guest_count: number;
    total_price: number;
    base_price?: number | null;
    tax_amount?: number | null;
    ticket_token: string | null;
    waiver_accepted_at?: string | null;
    waiver_url?: string | null;
  };
  marina: {
    name: string;
    slug: string;
    logo_url: string | null;
    timezone: string;
  };
  boat: { name: string; image_urls: string[] };
  ticketUrl?: string;
  addons?: { name: string; price: number }[];
}) {
  const timezone = marina.timezone ?? DEFAULT_TIMEZONE;
  const token = booking.ticket_token;
  const qrValue =
    ticketUrl ??
    (token ? buildTicketUrl(getAppBaseUrl(), marina.slug, token) : null);
  const imageUrl =
    boat.image_urls?.[0] ??
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80";

  return (
    <Card className="mx-auto max-w-md print:shadow-none">
      <CardHeader className="border-b text-center">
        {marina.logo_url ? (
          <Image
            src={marina.logo_url}
            alt={marina.name}
            width={48}
            height={48}
            className="mx-auto mb-2 rounded"
          />
        ) : null}
        <CardTitle>{marina.name}</CardTitle>
        <p className="text-sm text-muted-foreground">Digital Boarding Pass</p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="relative aspect-video overflow-hidden rounded-lg">
          <Image src={imageUrl} alt={boat.name} fill className="object-cover" />
        </div>

        <div className="space-y-2 text-sm">
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
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booking ID</span>
            <span className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <BookingStatusBadge status={booking.status} consumer />
          </div>
          {Number(booking.base_price ?? 0) > 0 && addons.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rental</span>
              <span>{formatCurrency(Number(booking.base_price))}</span>
            </div>
          )}
          {addons.map((addon) => (
            <div key={addon.name} className="flex justify-between">
              <span className="text-muted-foreground">{addon.name}</span>
              <span>{formatCurrency(addon.price)}</span>
            </div>
          ))}
          {Number(booking.tax_amount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(Number(booking.tax_amount))}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(booking.total_price))}</span>
          </div>
          {booking.waiver_accepted_at && (
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs text-emerald-700">Rental waiver accepted</span>
              {booking.waiver_url && (
                <a 
                  href={booking.waiver_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View PDF
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 border-t pt-6">
          {qrValue ? (
            <>
              <QrCode value={qrValue} size={180} />
              <p className="text-xs text-muted-foreground text-center">
                Scan to view this ticket
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              QR code unavailable. Please contact the marina with your booking reference.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
