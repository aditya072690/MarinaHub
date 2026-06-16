"use client";

import { TripCardActions } from "@/components/consumer/trip-card-actions";
import { CompletePaymentButton } from "@/components/consumer/complete-payment-button";
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency/format";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import type { ConsumerTrip } from "@/types/api";

export function TripCard({
  trip,
  canReview,
  reviewId,
}: {
  trip: ConsumerTrip;
  canReview?: boolean;
  reviewId?: string | null;
}) {
  const marina = trip.marinas;
  const boat = trip.boats;
  const timezone = marina?.timezone ?? DEFAULT_TIMEZONE;
  const awaitingPayment =
    trip.status === "pending" &&
    (trip.payment_status === "unpaid" || trip.payment_status === "pending");

  return (
    <Card className="border-marina-border shadow-none">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-marina-navy">{boat?.name}</p>
          <p className="text-sm text-slate-500">{marina?.name}</p>
          <p className="mt-1 text-sm text-slate-600">
            {formatInMarinaTimezone(trip.start_at, timezone, "EEE, MMM d, yyyy")} ·{" "}
            {formatInMarinaTimezone(trip.start_at, timezone, "h:mm a")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          {awaitingPayment ? (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-700">
              Payment required
            </Badge>
          ) : (
            <BookingStatusBadge status={trip.status} consumer />
          )}
          <span className="text-sm font-semibold text-marina-navy">
            {formatCurrency(Number(trip.total_price))}
          </span>
          {awaitingPayment && <CompletePaymentButton bookingId={trip.id} />}
          <TripCardActions
            trip={trip}
            canReview={canReview}
            reviewId={reviewId}
            boatName={boat?.name ?? "Boat"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
