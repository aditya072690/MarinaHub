import { getBookingDetailBundle } from "@/actions/bookings";
import { CheckInOutPanel } from "@/components/dashboard/booking-actions";
import { BookingActions } from "@/components/dashboard/booking-actions";
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { BookingTimeline } from "@/components/dashboard/booking-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency/format";
import { getSessionContext } from "@/lib/auth/session";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const bundle = await getBookingDetailBundle(id);
  if (!bundle) notFound();

  const { booking, history, addons } = bundle;
  const timezone = session.activeMarina.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/bookings"
            className="text-sm text-sky-600 hover:underline"
          >
            ← Back to bookings
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Booking Details</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <BookingActions
          booking={booking}
          role={session.activeRole!}
          showRestrictedHints
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Reservation
              <BookingStatusBadge status={booking.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Customer" value={booking.customers?.full_name} />
            <Row label="Email" value={booking.customers?.email} />
            <Row label="Boat" value={booking.boats?.name} />
            <Row
              label="Date"
              value={formatInMarinaTimezone(booking.start_at, timezone, "MMM d, yyyy")}
            />
            <Row
              label="Time"
              value={`${formatInMarinaTimezone(booking.start_at, timezone, "h:mm a")} – ${formatInMarinaTimezone(booking.end_at, timezone, "h:mm a")}`}
            />
            <Row label="Guests" value={String(booking.guest_count)} />
            <Row label="Total" value={formatCurrency(Number(booking.total_price))} />
            {Number(booking.addons_total) > 0 && (
              <Row
                label="Add-ons"
                value={formatCurrency(Number(booking.addons_total))}
              />
            )}
            {addons.length > 0 && (
              <div className="border-t pt-2">
                {addons.map((a) => (
                  <Row
                    key={a.id}
                    label={a.addon_catalog?.name ?? "Add-on"}
                    value={formatCurrency(Number(a.total_price))}
                  />
                ))}
              </div>
            )}
            {booking.checked_in_at && (
              <Row
                label="Checked in"
                value={formatInMarinaTimezone(booking.checked_in_at, timezone, "MMM d h:mm a")}
              />
            )}
            {booking.checked_out_at && (
              <Row
                label="Checked out"
                value={formatInMarinaTimezone(booking.checked_out_at, timezone, "MMM d h:mm a")}
              />
            )}
          </CardContent>
        </Card>

        <CheckInOutPanel booking={booking} role={session.activeRole!} />

        <Card>
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingTimeline history={history} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}
