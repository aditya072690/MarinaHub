import { computeBoatUtilization } from "@/lib/analytics/utilization";
import type { AnalyticsSummary, PopularBoat } from "@/types/api";

interface RpcAnalyticsRow {
  total_boats: number;
  total_bookings: number;
  total_revenue: number;
  revenue_this_month: number;
  upcoming_trips: number;
  monthly_bookings: { month: string; count: number; revenue: number }[];
  daily_bookings: { date: string; sort_key?: string; count: number; revenue: number }[];
  popular_boats: { id: string; name: string; booking_count: number; revenue: number }[];
  utilization_bookings: {
    boat_id: string;
    start_at: string;
    end_at: string;
    status: string;
  }[];
  utilization_blocks: {
    boat_id: string | null;
    start_at: string;
    end_at: string;
  }[];
  boats: { id: string; name: string }[];
  operating_hours: number;
}

export function mapRpcAnalyticsToSummary(data: RpcAnalyticsRow): AnalyticsSummary {
  const boats = data.boats ?? [];
  const blocks = data.utilization_blocks ?? [];
  const utilBookings = data.utilization_bookings ?? [];

  const popularBoats: PopularBoat[] = (data.popular_boats ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    bookingCount: Number(b.booking_count),
    revenue: Number(b.revenue),
  }));

  const utilization = boats.map((boat) =>
    computeBoatUtilization({
      boatId: boat.id,
      boatName: boat.name,
      bookings: utilBookings
        .filter((b) => b.boat_id === boat.id)
        .map((b) => ({
          start_at: b.start_at,
          end_at: b.end_at,
          status: b.status,
        })),
      blocks,
      operatingHoursPerDay: data.operating_hours ?? 10,
    })
  );

  return {
    totalBoats: data.total_boats ?? 0,
    totalBookings: data.total_bookings,
    totalRevenue: Number(data.total_revenue),
    revenueThisMonth: Number(data.revenue_this_month),
    upcomingTrips: data.upcoming_trips,
    monthlyBookings: data.monthly_bookings ?? [],
    dailyBookings: (data.daily_bookings ?? []).map(({ date, count, revenue }) => ({
      date,
      count,
      revenue: Number(revenue),
    })),
    popularBoats,
    utilization,
  };
}
