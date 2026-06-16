"use client";

import type { ReviewWithAuthor } from "@/actions/reviews";
import { ReviewList } from "@/components/consumer/review-list";
import { ReviewSubmissionDialog } from "@/components/consumer/review-submission-dialog";
import { StarRating } from "@/components/consumer/star-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BoatRatingStats } from "@/types/database";
import { Star } from "lucide-react";
import { useState } from "react";

export function BoatReviewsSection({
  stats,
  reviews,
  boatName,
  reviewEligibility,
}: {
  stats: BoatRatingStats | null;
  reviews: ReviewWithAuthor[];
  boatName: string;
  reviewEligibility?: {
    canReview: boolean;
    bookingId: string | null;
  };
}) {
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const displayed = showAll ? reviews : reviews.slice(0, 5);

  return (
    <section className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-amber-500" />
            Reviews
          </CardTitle>
          {stats && stats.review_count > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={Number(stats.avg_rating)} size="md" showValue />
              <span className="text-sm text-muted-foreground">
                · Based on {stats.review_count} review
                {stats.review_count !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              · Be the first to review after your trip
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {reviewEligibility?.canReview && reviewEligibility.bookingId && (
            <>
              <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
                Leave a Review
              </Button>
              <ReviewSubmissionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                bookingId={reviewEligibility.bookingId}
                boatName={boatName}
              />
            </>
          )}
          <ReviewList reviews={displayed} />
          {reviews.length > 5 && !showAll && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
              See all reviews
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
