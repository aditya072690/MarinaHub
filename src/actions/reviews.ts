"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canViewAnalytics } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { BoatRatingStats, Review } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export interface ReviewWithAuthor extends Review {
  author_name: string;
}

export interface ReviewEligibility {
  canReview: boolean;
  existingReview: Review | null;
  bookingId: string | null;
}

async function revalidateReviewSurfaces(
  supabase: Awaited<ReturnType<typeof createClient>>,
  marinaId: string,
  boatId: string
) {
  const { data: marina } = await supabase
    .from("marinas")
    .select("slug")
    .eq("id", marinaId)
    .single();

  if (marina?.slug) {
    revalidatePath(`/m/${marina.slug}`);
    revalidatePath(`/m/${marina.slug}/boats/${boatId}`);
  }
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/account/trips");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
}

export async function getBoatRatingStats(
  boatId: string
): Promise<BoatRatingStats | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("boat_rating_stats")
    .select("id, boat_id, rating, count, distribution")
    .eq("boat_id", boatId)
    .maybeSingle();
  return data as BoatRatingStats | null;
}

export async function getBoatReviews(
  boatId: string,
  limit = 10
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(full_name)")
    .eq("boat_id", boatId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null } | null;
    const fullName = profile?.full_name ?? "Guest";
    const parts = fullName.split(" ");
    const authorName =
      parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1]!.charAt(0)}.`
        : fullName;

    const { profiles: _, ...review } = row;
    return { ...(review as Review), author_name: authorName };
  });
}

export async function getMarinaRatingSummary(marinaId: string): Promise<{
  avgRating: number | null;
  reviewCount: number;
}> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("dashboard_stats")
    .select("avg_rating, review_count")
    .eq("marina_id", marinaId)
    .eq("period", "live")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached && cached.review_count > 0) {
    return {
      avgRating: cached.avg_rating != null ? Number(cached.avg_rating) : null,
      reviewCount: cached.review_count,
    };
  }

  const { data, error } = await supabase.rpc("get_marina_rating_aggregate", {
    p_marina_id: marinaId,
  });

  if (error) throw new Error(error.message);

  const result = data as { avg_rating: number | null; review_count: number };
  if (!result?.review_count) {
    return { avgRating: null, reviewCount: 0 };
  }

  return {
    avgRating: result.avg_rating != null ? Number(result.avg_rating) : null,
    reviewCount: result.review_count,
  };
}

export async function getMarinaRecentReviews(
  marinaId: string,
  limit = 8
): Promise<ReviewWithAuthor[]> {
  const session = await getSessionContext();
  if (!session?.activeMarina) return [];
  assertActiveMarina(session, marinaId, canViewAnalytics);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, boat_id, user_id, marina_id, booking_id, profiles(full_name), boats(name)")
    .eq("marina_id", marinaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null } | null;
    const fullName = profile?.full_name ?? "Guest";
    const { profiles: _, boats: __, ...review } = row;
    return { ...(review as Review), author_name: fullName };
  });
}

export async function getReviewEligibilityForBooking(
  bookingId: string
): Promise<ReviewEligibility> {
  const session = await getSessionContext();
  if (!session) {
    return { canReview: false, existingReview: null, bookingId: null };
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, customer_id, boat_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "completed") {
    return { canReview: false, existingReview: null, bookingId: null };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("user_id")
    .eq("id", booking.customer_id)
    .single();

  if (customer?.user_id !== session.userId) {
    return { canReview: false, existingReview: null, bookingId: null };
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id, booking_id, user_id, boat_id, marina_id, rating, comment, created_at, updated_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  return {
    canReview: !existing,
    existingReview: existing as Review | null,
    bookingId,
  };
}

export async function getTripReviewMeta(
  bookingIds: string[]
): Promise<Record<string, { canReview: boolean; reviewId: string | null }>> {
  const session = await getSessionContext();
  if (!session || bookingIds.length === 0) return {};

  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, customers(user_id)")
    .in("id", bookingIds)
    .eq("status", "completed");

  if (!bookings?.length) return {};

  const ownedBookingIds = bookings
    .filter((b) => {
      const c = Array.isArray(b.customers) ? b.customers[0] : b.customers;
      return c?.user_id === session.userId;
    })
    .map((b) => b.id);

  if (ownedBookingIds.length === 0) return {};

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, booking_id")
    .in("booking_id", ownedBookingIds);

  const result: Record<string, { canReview: boolean; reviewId: string | null }> =
    {};
  for (const id of ownedBookingIds) {
    const review = reviews?.find((r) => r.booking_id === id);
    result[id] = {
      canReview: !review,
      reviewId: review?.id ?? null,
    };
  }
  return result;
}

export async function submitReview(
  values: unknown
): Promise<ActionResult<Review>> {
  const session = await getSessionContext();
  if (!session) {
    return { success: false, error: "Sign in to leave a review" };
  }

  const { success: allowed } = await checkRateLimit(
    `review:${session.userId}`,
    5,
    3_600_000
  );
  if (!allowed) {
    return { success: false, error: "Too many review attempts. Try again later." };
  }

  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, boat_id, marina_id, customer_id")
    .eq("id", parsed.data.bookingId)
    .single();

  if (!booking || booking.status !== "completed") {
    return { success: false, error: "Only completed trips can be reviewed" };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("user_id")
    .eq("id", booking.customer_id)
    .single();

  if (customer?.user_id !== session.userId) {
    return { success: false, error: "You can only review your own trips" };
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", parsed.data.bookingId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "You already reviewed this trip" };
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: parsed.data.bookingId,
      user_id: session.userId,
      boat_id: booking.boat_id,
      marina_id: booking.marina_id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await writeAuditLog({
    marinaId: booking.marina_id,
    action: "review.created",
    entityType: "review",
    entityId: data.id,
    summary: `New ${parsed.data.rating}-star review submitted`,
    metadata: { boat_id: booking.boat_id, rating: parsed.data.rating },
  });

  await revalidateReviewSurfaces(supabase, booking.marina_id, booking.boat_id);

  return { success: true, data: data as Review };
}

export async function updateReview(
  values: unknown
): Promise<ActionResult<Review>> {
  const session = await getSessionContext();
  if (!session) {
    return { success: false, error: "Sign in to update your review" };
  }

  const parsed = updateReviewSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .update({
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    })
    .eq("id", parsed.data.reviewId)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const { data: reviewRow } = await supabase
    .from("reviews")
    .select("boat_id, marina_id")
    .eq("id", parsed.data.reviewId)
    .single();

  if (reviewRow) {
    await revalidateReviewSurfaces(
      supabase,
      reviewRow.marina_id,
      reviewRow.boat_id
    );
  } else {
    revalidatePath("/account/trips");
  }

  return { success: true, data: data as Review };
}

export async function getMarinaReviewsForProfile(
  marinaId: string,
  limit = 6
): Promise<{ reviews: ReviewWithAuthor[]; avgRating: number | null; reviewCount: number }> {
  const [reviews, summary] = await Promise.all([
    getBoatReviewsForMarina(marinaId, limit),
    getMarinaRatingSummary(marinaId),
  ]);
  return {
    reviews,
    avgRating: summary.avgRating,
    reviewCount: summary.reviewCount,
  };
}

async function getBoatReviewsForMarina(
  marinaId: string,
  limit: number
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(full_name), boats(name)")
    .eq("marina_id", marinaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null } | null;
    const fullName = profile?.full_name ?? "Guest";
    const { profiles: _, boats: __, ...review } = row;
    return { ...(review as Review), author_name: fullName };
  });
}
