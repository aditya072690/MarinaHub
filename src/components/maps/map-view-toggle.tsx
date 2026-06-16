"use client";

import { cn } from "@/lib/utils";
import { List, Map } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function MapViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "map" ? "map" : "list";

  function setView(next: "list" | "map") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") {
      params.delete("view");
    } else {
      params.set("view", "map");
    }
    router.push(`/search?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setView("list")}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
          view === "list"
            ? "bg-sky-600 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <List className="h-4 w-4" />
        List
      </button>
      <button
        type="button"
        onClick={() => setView("map")}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
          view === "map"
            ? "bg-sky-600 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Map className="h-4 w-4" />
        Map
      </button>
    </div>
  );
}
