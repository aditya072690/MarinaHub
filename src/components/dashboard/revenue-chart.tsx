"use client";

import {
  DashCard,
  DashCardContent,
} from "@/components/dashboard/dash-card";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { AnalyticsSummary } from "@/types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";

const CHART_COLORS = {
  bookings: "#1A9DC4",
  revenue: "#0B1F3A",
  grid: "rgba(11, 31, 58, 0.08)",
} as const;

const CHART_MARGIN = { top: 12, right: 20, left: 4, bottom: 4 };

export function RevenueChart({
  monthlyData,
  dailyData,
}: {
  monthlyData: AnalyticsSummary["monthlyBookings"];
  dailyData: AnalyticsSummary["dailyBookings"];
}) {
  const [activeTab, setActiveTab] = useState<"30d" | "6m">("30d");

  return (
    <DashCard hover={false}>
      <DashCardContent className="dash-card-content--chart">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "30d" | "6m")}
          className="dash-chart-tabs"
        >
          <TabsList className="h-9 w-fit rounded-lg bg-[#EAF2F8] p-1">
            <TabsTrigger
              value="30d"
              className="rounded-md px-3 data-[state=active]:bg-white data-[state=active]:text-[#0B1F3A]"
            >
              Last 30 days
            </TabsTrigger>
            <TabsTrigger
              value="6m"
              className="rounded-md px-3 data-[state=active]:bg-white data-[state=active]:text-[#0B1F3A]"
            >
              Last 6 months
            </TabsTrigger>
          </TabsList>
          <TabsContent value="30d" className="mt-0">
            {activeTab === "30d" && (
              <Chart data={dailyData} xKey="date" />
            )}
          </TabsContent>
          <TabsContent value="6m" className="mt-0">
            {activeTab === "6m" && (
              <Chart data={monthlyData} xKey="month" />
            )}
          </TabsContent>
        </Tabs>
      </DashCardContent>
    </DashCard>
  );
}

function Chart({
  data,
  xKey,
}: {
  data: { count: number; revenue: number; [key: string]: string | number }[];
  xKey: string;
}) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const height = isMobile ? 240 : 320;

  return (
    <div className="dash-chart-surface w-full" style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey={xKey}
            fontSize={isMobile ? 10 : 11}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={isMobile ? 28 : 36}
            stroke="#6B88A0"
            tick={{ fill: "#6B88A0" }}
          />
          <YAxis
            yAxisId="left"
            fontSize={isMobile ? 10 : 11}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={isMobile ? 40 : 48}
            stroke="#6B88A0"
            tick={{ fill: "#6B88A0" }}
          />
          {!isMobile && (
            <YAxis
              yAxisId="right"
              orientation="right"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              stroke="#6B88A0"
              tick={{ fill: "#6B88A0" }}
            />
          )}
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
            wrapperStyle={{
              paddingTop: 8,
              fontSize: isMobile ? 11 : 12,
              fontFamily: "var(--font-inter), sans-serif",
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill={CHART_COLORS.bookings}
            name="Bookings"
            radius={[4, 4, 0, 0]}
            maxBarSize={isMobile ? 28 : 40}
          />
          <Line
            yAxisId={isMobile ? "left" : "right"}
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.revenue}
            name="Revenue"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
