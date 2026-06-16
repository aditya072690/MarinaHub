"use client";

import { formatHourlyRate } from "@/lib/currency/format";
import { Button } from "@/components/ui/button";
import type { Boat } from "@/types/database";

export function BoatMobileBookBar({ boat }: { boat: Boat }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-4 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{boat.name}</p>
          <p className="text-sm text-muted-foreground">
            From {formatHourlyRate(Number(boat.hourly_rate))}
          </p>
        </div>
        <Button
          className="bg-sky-600 hover:bg-sky-700"
          onClick={() => {
            document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Book Now
        </Button>
      </div>
    </div>
  );
}
