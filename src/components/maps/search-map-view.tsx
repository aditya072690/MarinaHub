"use client";

import dynamic from "next/dynamic";
import type { MarinaMapMarker } from "@/actions/marinas-map";
import { Skeleton } from "@/components/ui/skeleton";

const MarinaMap = dynamic(
  () => import("@/components/maps/marina-map").then((m) => m.MarinaMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[50vh] min-h-[280px] w-full rounded-xl sm:h-[400px] lg:h-[500px]" />
    ),
  }
);

export function SearchMapView({ marinas }: { marinas: MarinaMapMarker[] }) {
  return (
    <MarinaMap
      marinas={marinas}
      className="h-[50vh] min-h-[280px] w-full rounded-xl border shadow-sm sm:h-[400px] lg:h-[500px]"
    />
  );
}
