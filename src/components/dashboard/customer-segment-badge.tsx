"use client";

import { Badge } from "@/components/ui/badge";
import { getSegmentLabel, getSegmentVariant } from "@/lib/segmentation/classify-customer";
import type { CustomerSegment } from "@/types/database";

export function CustomerSegmentBadge({ segment }: { segment: CustomerSegment }) {
  return (
    <Badge variant={getSegmentVariant(segment)} className="capitalize">
      {getSegmentLabel(segment)}
    </Badge>
  );
}
