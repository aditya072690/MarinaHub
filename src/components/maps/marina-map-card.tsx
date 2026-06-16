"use client";

import type { MarinaMapMarker } from "@/actions/marinas-map";
import { buildDirectionsUrl } from "@/lib/maps/directions-url";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin, Star } from "lucide-react";
import Link from "next/link";

export function MarinaMapCard({ marina }: { marina: MarinaMapMarker }) {
  const location = [marina.city, marina.state].filter(Boolean).join(", ");
  const directionsUrl = buildDirectionsUrl({
    lat: marina.lat,
    lng: marina.lng,
    city: marina.city,
    state: marina.state,
  });

  return (
    <div className="min-w-[200px] space-y-2 p-1">
      <p className="font-semibold leading-tight">{marina.name}</p>
      {location && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {location}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {marina.avgRating != null ? (
          <span className="flex items-center gap-0.5 text-amber-600">
            <Star className="h-3 w-3 fill-current" />
            {marina.avgRating.toFixed(1)}
          </span>
        ) : (
          <span className="text-muted-foreground">No reviews yet</span>
        )}
        <span className="text-muted-foreground">
          · {marina.boatCount} boat{marina.boatCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        <Link
          href={`/m/${marina.slug}`}
          className={cn(buttonVariants({ size: "sm" }), "h-8 w-full justify-center")}
        >
          View Boats
        </Link>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 w-full justify-center"
          )}
        >
          Directions
        </a>
      </div>
    </div>
  );
}
