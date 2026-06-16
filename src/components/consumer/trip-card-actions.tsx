"use client";

import { ReviewSubmissionDialog } from "@/components/consumer/review-submission-dialog";
import { Button } from "@/components/ui/button";
import type { ConsumerTrip } from "@/types/api";
import Link from "next/link";
import { useState } from "react";

export function TripCardActions({
  trip,
  canReview,
  reviewId,
  boatName,
}: {
  trip: ConsumerTrip;
  canReview?: boolean;
  reviewId?: string | null;
  boatName: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const marina = trip.marinas;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {trip.ticket_token &&
        marina?.slug &&
        trip.payment_status === "paid" && (
        <>
          <Link
            href={`/m/${marina.slug}/booking/ticket/${trip.ticket_token}`}
            className="text-sm font-medium text-sky-600 hover:underline"
          >
            View ticket
          </Link>
          <Link
            href={`/m/${marina.slug}/booking/itinerary/${trip.ticket_token}`}
            className="text-sm font-medium text-sky-600 hover:underline"
          >
            Itinerary
          </Link>
        </>
      )}
      {trip.status === "completed" && canReview && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            Leave a Review
          </Button>
          <ReviewSubmissionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            bookingId={trip.id}
            boatName={boatName}
          />
        </>
      )}
      {trip.status === "completed" && reviewId && (
        <span className="text-xs text-muted-foreground">Review submitted</span>
      )}
    </div>
  );
}
