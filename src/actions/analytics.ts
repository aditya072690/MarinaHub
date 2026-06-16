"use server";

import { getCachedAnalyticsSummary } from "@/lib/data/analytics-summary";
import type { AnalyticsSummary } from "@/types/api";

export async function getAnalyticsSummary(
  marinaId: string
): Promise<AnalyticsSummary> {
  return getCachedAnalyticsSummary(marinaId);
}

export async function getBoatUtilization(marinaId: string) {
  const summary = await getCachedAnalyticsSummary(marinaId);
  return summary.utilization;
}
