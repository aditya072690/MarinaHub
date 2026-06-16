"use client";

import { submitReview, updateReview } from "@/actions/reviews";
import { StarRatingInput } from "@/components/consumer/star-rating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Review } from "@/types/database";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ReviewSubmissionDialog({
  open,
  onOpenChange,
  bookingId,
  boatName,
  existingReview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  boatName: string;
  existingReview?: Review | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }

    setLoading(true);
    const result = existingReview
      ? await updateReview({
          reviewId: existingReview.id,
          rating,
          comment: comment.trim() || undefined,
        })
      : await submitReview({
          bookingId,
          rating,
          comment: comment.trim() || undefined,
        });

    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(existingReview ? "Review updated" : "Thank you for your review!");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Edit your review" : "Leave a review"}
          </DialogTitle>
          <DialogDescription>
            How was your trip on {boatName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRatingInput value={rating} onChange={setRating} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || rating < 1}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingReview ? "Save changes" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
