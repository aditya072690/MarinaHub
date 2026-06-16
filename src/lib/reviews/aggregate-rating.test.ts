import { describe, expect, it } from "vitest";
import {
  computeAverageRating,
  computeBoatRatingStats,
} from "./aggregate-rating";

describe("computeAverageRating", () => {
  it("returns null average for empty input", () => {
    expect(computeAverageRating([])).toEqual({
      avgRating: null,
      reviewCount: 0,
    });
  });

  it("computes rounded average to one decimal", () => {
    expect(computeAverageRating([5, 4, 4, 5])).toEqual({
      avgRating: 4.5,
      reviewCount: 4,
    });
  });

  it("handles single review", () => {
    expect(computeAverageRating([3])).toEqual({
      avgRating: 3,
      reviewCount: 1,
    });
  });
});

describe("computeBoatRatingStats", () => {
  it("groups reviews by boat_id", () => {
    const stats = computeBoatRatingStats([
      { boat_id: "b1", marina_id: "m1", rating: 5 },
      { boat_id: "b1", marina_id: "m1", rating: 4 },
      { boat_id: "b2", marina_id: "m1", rating: 3 },
    ]);

    expect(stats.get("b1")).toEqual({
      boat_id: "b1",
      marina_id: "m1",
      review_count: 2,
      avg_rating: 4.5,
    });
    expect(stats.get("b2")).toEqual({
      boat_id: "b2",
      marina_id: "m1",
      review_count: 1,
      avg_rating: 3,
    });
  });
});
