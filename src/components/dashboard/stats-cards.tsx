import { formatCurrency } from "@/lib/currency/format";
import { CalendarCheck, IndianRupee, Ship, Star, TrendingUp } from "lucide-react";
import type { AnalyticsSummary } from "@/types/api";

export function StatsCards({
  data,
  revenueThisMonth,
  avgRating,
  reviewCount,
}: {
  data: AnalyticsSummary;
  revenueThisMonth?: number;
  avgRating?: number | null;
  reviewCount?: number;
}) {
  const stats = [
    {
      title: "Revenue This Month",
      value: formatCurrency(revenueThisMonth ?? data.revenueThisMonth),
      icon: IndianRupee,
    },
    {
      title: "Average Rating",
      value:
        avgRating != null && (reviewCount ?? 0) > 0
          ? `${avgRating.toFixed(1)} ★`
          : "—",
      icon: Star,
    },
    {
      title: "Upcoming Trips",
      value: String(data.upcomingTrips),
      icon: TrendingUp,
    },
    {
      title: "Total Boats",
      value: String(data.totalBoats),
      icon: Ship,
    },
    {
      title: "Bookings",
      value: String(data.totalBookings),
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="dash-insights-grid dash-insights-grid--stats">
      {stats.map((stat) => (
        <div key={stat.title} className="dash-insight-card">
          <div className="dash-insight-icon">
            <stat.icon className="h-4 w-4" />
          </div>
          <p className="dash-insight-label">{stat.title}</p>
          <p className="dash-insight-value">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
