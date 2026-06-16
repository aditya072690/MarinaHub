import type { AvailabilityBlock } from "@/types/database";

export const BLOCK_REASON_LABELS: Record<
  AvailabilityBlock["reason"],
  string
> = {
  maintenance: "Maintenance",
  owner_hold: "Reserved",
  weather: "Weather",
  manual: "Manual",
  other: "Other",
};
