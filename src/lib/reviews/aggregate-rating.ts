/**
 * Pure helpers for review rating aggregation (mirrors server action logic).
 */
export function computeAverageRating(ratings: number[]): {
  avgRating: number | null;
  reviewCount: number;
} {
  if (ratings.length === 0) {
    return { avgRating: null, reviewCount: 0 };
  }
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return {
    avgRating: Math.round((sum / ratings.length) * 10) / 10,
    reviewCount: ratings.length,
  };
}

export function computeBoatRatingStats(
  reviews: Array<{ boat_id: string; marina_id: string; rating: number }>
): Map<string, { boat_id: string; marina_id: string; review_count: number; avg_rating: number }> {
  const groups = new Map<string, number[]>();
  for (const r of reviews) {
    const key = r.boat_id;
    const list = groups.get(key) ?? [];
    list.push(r.rating);
    groups.set(key, list);
  }

  const stats = new Map<
    string,
    { boat_id: string; marina_id: string; review_count: number; avg_rating: number }
  >();

  for (const r of reviews) {
    if (stats.has(r.boat_id)) continue;
    const ratings = groups.get(r.boat_id)!;
    const sum = ratings.reduce((a, n) => a + n, 0);
    stats.set(r.boat_id, {
      boat_id: r.boat_id,
      marina_id: r.marina_id,
      review_count: ratings.length,
      avg_rating: Math.round((sum / ratings.length) * 10) / 10,
    });
  }

  return stats;
}
