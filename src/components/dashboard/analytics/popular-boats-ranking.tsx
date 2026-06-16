import { formatCurrency } from "@/lib/currency/format";
import { AnalyticsEmptyState } from "@/components/dashboard/analytics/analytics-empty-state";
import type { PopularBoat } from "@/types/api";

export function PopularBoatsRanking({ boats }: { boats: PopularBoat[] }) {
  if (boats.length === 0) {
    return (
      <AnalyticsEmptyState
        title="No popular boats yet"
        description="Ranking appears after boats receive bookings in the last 90 days."
        href="/dashboard/boats"
        actionLabel="Add boats"
      />
    );
  }

  const hasBookings = boats.some((b) => b.bookingCount > 0);
  if (!hasBookings) {
    return (
      <AnalyticsEmptyState
        title="No bookings in the last 90 days"
        description="Share your booking page or widget to start filling the calendar."
        href="/dashboard/widget"
        actionLabel="Get embed code"
      />
    );
  }

  const maxCount = Math.max(...boats.map((b) => b.bookingCount), 1);

  return (
    <div className="space-y-4">
      {boats.map((boat, index) => (
        <div key={boat.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-[#0B1F3A]">
              <span className="mr-2 font-normal text-[#6B88A0]">#{index + 1}</span>
              {boat.name}
            </span>
            <span className="shrink-0 text-[#4A6580]">
              {boat.bookingCount} bookings ·{" "}
              {formatCurrency(boat.revenue, "INR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="dash-ranking-bar">
            <div
              className="dash-ranking-bar-fill"
              style={{ width: `${(boat.bookingCount / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
