"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canEditCustomers, canViewAnalytics } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { parseRevenueForecast } from "@/lib/forecast/parse-forecast";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type {
  Customer,
  CustomerSegment,
  CustomerSegmentSnapshot,
  RevenueForecast,
} from "@/types/database";
import { revalidatePath } from "next/cache";

export async function refreshCustomerSegments(marinaId: string): Promise<number> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canViewAnalytics);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refresh_customer_segments", {
    p_marina_id: marinaId,
  });

  if (error) throw new Error(error.message);
  return data as number;
}

export async function getCustomerSegments(
  marinaId: string,
  segment?: CustomerSegment,
  options?: { skipRefresh?: boolean }
): Promise<(CustomerSegmentSnapshot & { customers: Customer })[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  if (!options?.skipRefresh) {
    await refreshCustomerSegments(marinaId);
  }

  const supabase = await createClient();
  let query = supabase
    .from("customer_segment_snapshots")
    .select(
      "customer_id, marina_id, segment, completed_bookings, total_spent, last_booking_at, computed_at, customers(id, full_name, email)"
    )
    .eq("marina_id", marinaId);

  if (segment) {
    query = query.eq("segment", segment);
  }

  const { data, error } = await query.order("total_spent", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (CustomerSegmentSnapshot & { customers: Customer })[];
}

export async function getSegmentSummaryFromSegments(
  segments: (CustomerSegmentSnapshot & { customers: Customer })[]
) {
  const total = segments.length || 1;

  const groups = {
    first_time: segments.filter((s) => s.segment === "first_time"),
    returning: segments.filter((s) => s.segment === "returning"),
    vip: segments.filter((s) => s.segment === "vip"),
  };

  return {
    first_time: {
      count: groups.first_time.length,
      pct: Math.round((groups.first_time.length / total) * 100),
      avgSpend:
        groups.first_time.length > 0
          ? groups.first_time.reduce((a, s) => a + Number(s.total_spent), 0) /
            groups.first_time.length
          : 0,
    },
    returning: {
      count: groups.returning.length,
      pct: Math.round((groups.returning.length / total) * 100),
      avgSpend:
        groups.returning.length > 0
          ? groups.returning.reduce((a, s) => a + Number(s.total_spent), 0) /
            groups.returning.length
          : 0,
    },
    vip: {
      count: groups.vip.length,
      pct: Math.round((groups.vip.length / total) * 100),
      avgSpend:
        groups.vip.length > 0
          ? groups.vip.reduce((a, s) => a + Number(s.total_spent), 0) / groups.vip.length
          : 0,
    },
  };
}

export async function getSegmentSummary(marinaId: string) {
  const segments = await getCustomerSegments(marinaId);
  return getSegmentSummaryFromSegments(segments);
}

export async function toggleCustomerVip(
  marinaId: string,
  customerId: string,
  vip: boolean
): Promise<ActionResult<void>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canEditCustomers);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("metadata")
    .eq("id", customerId)
    .eq("marina_id", marinaId)
    .single();

  const metadata = (existing?.metadata as Record<string, unknown>) ?? {};

  const { error } = await supabase
    .from("customers")
    .update({ metadata: { ...metadata, vip: vip ? "true" : "false" } })
    .eq("id", customerId)
    .eq("marina_id", marinaId);

  if (error) return { success: false, error: error.message };

  await supabase.rpc("refresh_customer_segments", { p_marina_id: marinaId });

  revalidatePath("/dashboard/customers");
  return { success: true, data: undefined };
}

export async function getRevenueForecast(
  marinaId: string,
  days = 30
): Promise<RevenueForecast | null> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canViewAnalytics);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_revenue_forecast", {
    p_marina_id: marinaId,
    p_days: days,
  });

  if (error) {
    if (
      error.message.includes("get_revenue_forecast") ||
      error.message.includes("schema cache")
    ) {
      return null;
    }
    throw new Error(error.message);
  }

  return parseRevenueForecast(data);
}

export async function getCustomerSegmentSnapshot(
  marinaId: string,
  customerId: string
): Promise<CustomerSegmentSnapshot | null> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_segment_snapshots")
    .select("customer_id, marina_id, segment, completed_bookings, total_spent, last_booking_at, computed_at")
    .eq("marina_id", marinaId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CustomerSegmentSnapshot | null;
}
