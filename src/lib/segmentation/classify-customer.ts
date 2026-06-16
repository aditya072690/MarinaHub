import type { CustomerSegment } from "@/types/database";

export interface SegmentThresholds {
  vip_min_bookings: number;
  vip_min_spend: number;
}

export interface SegmentInput {
  completed_bookings: number;
  total_spent: number;
  manual_vip?: boolean;
}

/** Mirrors refresh_customer_segments SQL logic for tests and UI copy */
export function computeCustomerSegment(
  input: SegmentInput,
  thresholds: SegmentThresholds = { vip_min_bookings: 5, vip_min_spend: 2500 }
): CustomerSegment {
  if (input.manual_vip) return "vip";
  if (
    input.completed_bookings >= thresholds.vip_min_bookings ||
    input.total_spent >= thresholds.vip_min_spend
  ) {
    return "vip";
  }
  if (input.completed_bookings >= 1) return "returning";
  return "first_time";
}

export function getSegmentLabel(segment: CustomerSegment): string {
  switch (segment) {
    case "vip":
      return "VIP";
    case "returning":
      return "Returning";
    case "first_time":
      return "First-Time";
  }
}

export function getSegmentVariant(
  segment: CustomerSegment
): "default" | "secondary" | "outline" {
  switch (segment) {
    case "vip":
      return "default";
    case "returning":
      return "secondary";
    case "first_time":
      return "outline";
  }
}
