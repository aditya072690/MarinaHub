import { mapRpcAnalyticsToSummary } from "@/lib/analytics/fetch-summary";
import { DEFAULT_OPERATING_HOURS_PER_DAY } from "@/lib/analytics/utilization";
import { createClient } from "@/lib/supabase/server";
import type { AnalyticsSummary } from "@/types/api";

interface DashboardStatsRow {
  total_revenue: number;
  total_bookings: number;
  utilization_pct: number;
  avg_rating: number | null;
  review_count: number;
  forecast_30d: unknown;
  revenue_this_month: number;
  upcoming_trips: number;
  total_boats: number;
  monthly_chart: { month: string; count: number; revenue: number }[];
  daily_chart: { date: string; count: number; revenue: number }[];
  popular_boats: { id: string; name: string; booking_count: number; revenue: number }[];
  utilization_data: { id: string; name: string; booked_hours: number }[];
  updated_at: string;
}

function mapStatsRowToSummary(row: DashboardStatsRow): AnalyticsSummary {
  const daysInMonth = 30;
  const availablePerBoat = daysInMonth * DEFAULT_OPERATING_HOURS_PER_DAY;

  const utilization = (row.utilization_data ?? []).map((boat) => {
    const bookedHours = Number(boat.booked_hours);
    return {
      id: boat.id,
      name: boat.name,
      bookedHours: Math.round(bookedHours * 10) / 10,
      availableHours: availablePerBoat,
      utilizationPct: Math.min(
        100,
        Math.round((bookedHours / availablePerBoat) * 100)
      ),
    };
  });

  return {
    totalBoats: row.total_boats,
    totalBookings: row.total_bookings,
    totalRevenue: Number(row.total_revenue),
    revenueThisMonth: Number(row.revenue_this_month),
    upcomingTrips: row.upcoming_trips,
    monthlyBookings: (row.monthly_chart ?? []).map((m) => ({
      month: m.month,
      count: m.count,
      revenue: Number(m.revenue),
    })),
    dailyBookings: (row.daily_chart ?? []).map((d) => ({
      date: d.date,
      count: d.count,
      revenue: Number(d.revenue),
    })),
    popularBoats: (row.popular_boats ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      bookingCount: Number(b.booking_count),
      revenue: Number(b.revenue),
    })),
    utilization,
    avgRating: row.avg_rating != null ? Number(row.avg_rating) : null,
    reviewCount: row.review_count,
  };
}

/** Reads precomputed stats from dashboard_stats (Postgres cache). Requires auth cookies for RLS. */
async function fetchDashboardStatsRow(
  marinaId: string
): Promise<DashboardStatsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_stats")
    .select(
      "total_revenue, total_bookings, utilization_pct, avg_rating, review_count, forecast_30d, revenue_this_month, upcoming_trips, total_boats, monthly_chart, daily_chart, popular_boats, utilization_data, updated_at"
    )
    .eq("marina_id", marinaId)
    .eq("period", "live")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const ageMs = Date.now() - new Date(data.updated_at).getTime();
  const stale =
    ageMs > 5 * 60 * 1000 ||
    (Number(data.revenue_this_month) === 0 && Number(data.total_bookings) > 0);

  if (stale) {
    await supabase.rpc("refresh_dashboard_stats", { p_marina_id: marinaId });
    const { data: refreshed } = await supabase
      .from("dashboard_stats")
      .select(
        "total_revenue, total_bookings, utilization_pct, avg_rating, review_count, forecast_30d, revenue_this_month, upcoming_trips, total_boats, monthly_chart, daily_chart, popular_boats, utilization_data, updated_at"
      )
      .eq("marina_id", marinaId)
      .eq("period", "live")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (refreshed) return refreshed as DashboardStatsRow;
  }

  return data as DashboardStatsRow;
}

export async function getCachedAnalyticsSummary(
  marinaId: string
): Promise<AnalyticsSummary | null> {
  const row = await fetchDashboardStatsRow(marinaId);
  if (!row) return null;
  return mapStatsRowToSummary(row);
}

export async function getAnalyticsSummaryWithFallback(
  marinaId: string
): Promise<AnalyticsSummary> {
  const cached = await getCachedAnalyticsSummary(marinaId);
  if (cached) return cached;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_marina_analytics_summary", {
    p_marina_id: marinaId,
  });

  if (error) throw new Error(error.message);

  void supabase.rpc("refresh_dashboard_stats", { p_marina_id: marinaId });

  return mapRpcAnalyticsToSummary(
    data as Parameters<typeof mapRpcAnalyticsToSummary>[0]
  );
}
