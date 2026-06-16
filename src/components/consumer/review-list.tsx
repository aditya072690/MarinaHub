import { StarRating } from "@/components/consumer/star-rating";
import { EmptyState } from "@/components/shared/empty-state";
import type { ReviewWithAuthor } from "@/actions/reviews";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

export function ReviewList({ reviews }: { reviews: ReviewWithAuthor[] }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No reviews yet"
        description="Be the first to share your experience after a completed trip."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-xl border bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{review.author_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <StarRating rating={review.rating} size="sm" />
          </div>
          {review.comment && (
            <p className="text-sm text-muted-foreground">&ldquo;{review.comment}&rdquo;</p>
          )}
        </article>
      ))}
    </div>
  );
}
