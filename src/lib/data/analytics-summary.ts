import { assertActiveMarina } from "@/lib/auth/guards";
import { canViewAnalytics } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getAnalyticsSummaryWithFallback } from "@/lib/cache/dashboard-stats";
import type { AnalyticsSummary } from "@/types/api";
import { cache } from "react";

export const getCachedAnalyticsSummary = cache(
  async (marinaId: string): Promise<AnalyticsSummary> => {
    const session = await requireSession();
    assertActiveMarina(session, marinaId, canViewAnalytics);
    return getAnalyticsSummaryWithFallback(marinaId);
  }
);
