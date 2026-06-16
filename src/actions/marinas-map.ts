"use server";

import { createClient } from "@/lib/supabase/server";

export interface MarinaMapMarker {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  city: string | null;
  state: string | null;
  boatCount: number;
  avgRating: number | null;
  reviewCount: number;
}

export async function getMarinasForMap(
  marinaIds?: string[]
): Promise<MarinaMapMarker[]> {
  const supabase = await createClient();

  let query = supabase
    .from("marinas")
    .select("id, slug, name, lat, lng, city, state")
    .eq("is_active", true)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (marinaIds?.length) {
    query = query.in("id", marinaIds);
  }

  const { data: marinas, error } = await query;
  if (error) throw new Error(error.message);
  if (!marinas?.length) return [];

  const ids = marinas.map((m) => m.id);

  const [{ data: boats }, { data: reviews }] = await Promise.all([
    supabase
      .from("boats")
      .select("marina_id")
      .in("marina_id", ids)
      .eq("status", "active"),
    supabase.from("reviews").select("marina_id, rating").in("marina_id", ids),
  ]);

  const boatCounts = new Map<string, number>();
  for (const b of boats ?? []) {
    boatCounts.set(b.marina_id, (boatCounts.get(b.marina_id) ?? 0) + 1);
  }

  const ratingAgg = new Map<string, { sum: number; count: number }>();
  for (const r of reviews ?? []) {
    const cur = ratingAgg.get(r.marina_id) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    ratingAgg.set(r.marina_id, cur);
  }

  return marinas.map((m) => {
    const agg = ratingAgg.get(m.id);
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      lat: m.lat as number,
      lng: m.lng as number,
      city: m.city,
      state: m.state,
      boatCount: boatCounts.get(m.id) ?? 0,
      avgRating: agg
        ? Math.round((agg.sum / agg.count) * 10) / 10
        : null,
      reviewCount: agg?.count ?? 0,
    };
  });
}
