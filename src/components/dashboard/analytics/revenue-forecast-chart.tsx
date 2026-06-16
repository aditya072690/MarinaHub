"use client";

import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { formatCurrency } from "@/lib/currency/format";
import type { RevenueForecast } from "@/types/database";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

const CHART_COLORS = {
  confirmed: "#1A9DC4",
  projected: "#C8DAE8",
  grid: "rgba(11, 31, 58, 0.08)",
} as const;

interface RevenueForecastChartProps {
  forecast: RevenueForecast;
}

export function RevenueForecastChart({ forecast }: RevenueForecastChartProps) {
  const chartData = forecast.daily.map((d) => ({
    date: format(parseISO(d.date), "MMM d"),
    confirmed: d.confirmed,
    projected: d.projected,
    total: d.total,
  }));

  return (
    <DashCard hover={false}>
      <DashCardHeader>
        <DashCardTitle className="dash-card-title-lg flex flex-wrap items-baseline justify-between gap-2">
          <span>Expected Revenue — Next 30 Days</span>
          <span className="dash-card-stat">
            {formatCurrency(forecast.total_forecast, "INR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </DashCardTitle>
        <div className="dash-card-meta flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Confirmed:{" "}
            {formatCurrency(forecast.confirmed_portion, "INR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
          <span>
            Projected:{" "}
            {formatCurrency(forecast.projected_portion, "INR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
          <span className="capitalize">Confidence: {forecast.confidence}</span>
        </div>
      </DashCardHeader>
      <DashCardContent className="dash-card-content--chart !pt-3">
        <div className="dash-chart mt-2" style={{ minHeight: 288, width: "100%" }}>
          <ResponsiveContainer width="100%" height={288}>
            <BarChart data={chartData} margin={{ top: 12, right: 20, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B88A0" }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                stroke="#6B88A0"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B88A0" }}
                stroke="#6B88A0"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                tickFormatter={(v) =>
                  formatCurrency(v, "INR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(11, 31, 58, 0.08)",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "0.8125rem",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                wrapperStyle={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                dataKey="confirmed"
                name="Confirmed"
                stackId="a"
                fill={CHART_COLORS.confirmed}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="projected"
                name="Projected"
                stackId="a"
                fill={CHART_COLORS.projected}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashCardContent>
    </DashCard>
  );
}
