import type { ReviewWithAuthor } from "@/actions/reviews";
import { StarRating } from "@/components/consumer/star-rating";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDistanceToNow } from "date-fns";
import { Star } from "lucide-react";

export function RecentReviewsPanel({
  reviews,
  avgRating,
  reviewCount,
}: {
  reviews: ReviewWithAuthor[];
  avgRating: number | null;
  reviewCount: number;
}) {
  return (
    <DashCard hover={false}>
      <DashCardHeader>
        <DashCardTitle className="dash-card-title-lg">Recent Reviews</DashCardTitle>
        {avgRating != null && reviewCount > 0 && (
          <div className="dash-card-meta flex items-center gap-2">
            <StarRating rating={avgRating} size="sm" showValue />
            <span>
              · {reviewCount} total review{reviewCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </DashCardHeader>
      <DashCardContent>
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No guest reviews yet"
            description="Reviews appear after guests complete trips and submit feedback."
            className="border-0 py-6"
          />
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="border-b border-[rgba(11,31,58,0.06)] pb-4 last:border-0 last:pb-0"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#0B1F3A]">
                    {review.author_name}
                  </span>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.comment && (
                  <p className="text-sm leading-relaxed text-[#4A6580] line-clamp-2">
                    {review.comment}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#6B88A0]">
                  {formatDistanceToNow(new Date(review.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DashCardContent>
    </DashCard>
  );
}
