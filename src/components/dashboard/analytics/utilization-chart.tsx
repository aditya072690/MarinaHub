"use client";

import { AnalyticsEmptyState } from "@/components/dashboard/analytics/analytics-empty-state";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { BoatUtilization } from "@/lib/analytics/utilization";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function UtilizationChart({ data }: { data: BoatUtilization[] }) {
  const isMobile = useMediaQuery("(max-width: 639px)");

  if (data.length === 0) {
    return (
      <AnalyticsEmptyState
        title="No utilization data yet"
        description="Add boats to your fleet and start taking bookings to see utilization metrics."
        href="/dashboard/boats"
        actionLabel="Manage fleet"
      />
    );
  }

  const hasActivity = data.some((d) => d.bookedHours > 0);
  if (!hasActivity) {
    return (
      <AnalyticsEmptyState
        title="No bookings this month"
        description="Utilization will appear once you have confirmed or completed trips this month."
        href="/dashboard/bookings"
        actionLabel="View bookings"
      />
    );
  }

  return (
    <div className="dash-chart mt-4" style={{ minHeight: isMobile ? 240 : 280, width: "100%" }}>
      <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
      <BarChart data={data} margin={{ top: 12, right: 20, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 31, 58, 0.08)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "#6B88A0" }}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          stroke="#6B88A0"
        />
        <YAxis
          unit="%"
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "#6B88A0" }}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          stroke="#6B88A0"
        />
        <Tooltip
          formatter={(value, name) => {
            const v = Number(value ?? 0);
            if (name === "utilizationPct") return [`${v}%`, "Utilization"];
            return [v, String(name)];
          }}
        />
        <Bar
          dataKey="utilizationPct"
          fill="#1A9DC4"
          radius={[4, 4, 0, 0]}
          name="utilizationPct"
        />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
