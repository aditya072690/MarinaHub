"use client";

import dynamic from "next/dynamic";
import type { MarinaMapMarker } from "@/actions/marinas-map";
import { Skeleton } from "@/components/ui/skeleton";

const MarinaMap = dynamic(
  () => import("@/components/maps/marina-map").then((m) => m.MarinaMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[280px] w-full rounded-xl md:h-[420px]" />
    ),
  }
);

export function ExploreMarinasSection({
  marinas,
}: {
  marinas: MarinaMapMarker[];
}) {
  return (
    <section
      className="em-section bg-[var(--em-bg)]"
      style={{
        padding: "clamp(3rem, 8vh, 5rem) clamp(1.25rem, 4vw, 3rem)",
      }}
    >
      <div className="landing-container">
        <header className="em-header">
          <span
            className="em-eyebrow"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Marina Locator
          </span>
          <h2
            className="em-title text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.025em] text-[var(--em-headline)]"
            style={{ fontFamily: "var(--font-sora), sans-serif" }}
          >
            Explore Marinas
          </h2>
          <div className="em-wave-rule" aria-hidden="true" />
          <p
            className="em-subtitle text-[0.95rem] font-normal text-[var(--em-subtext)]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Find boat rentals near you on the map
          </p>
        </header>

        <div className="em-map-shell">
          <div className="em-map-corners" aria-hidden="true">
            <span className="em-corner em-corner-tl" />
            <span className="em-corner em-corner-tr" />
            <span className="em-corner em-corner-bl" />
            <span className="em-corner em-corner-br" />
          </div>
          <MarinaMap
            marinas={marinas}
            className="em-map h-[280px] w-full md:h-[420px]"
          />
        </div>
      </div>
    </section>
  );
}
