"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function TripTabs() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "past" ? "past" : "upcoming";

  return (
    <div className="inline-flex rounded-lg border border-marina-border bg-white p-1">
      {(
        [
          { id: "upcoming", label: "Upcoming", href: "/account/trips" },
          { id: "past", label: "Past", href: "/account/trips?tab=past" },
        ] as const
      ).map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === item.id
              ? "bg-marina-navy font-semibold text-white"
              : "text-slate-600 hover:bg-slate-50 hover:text-marina-navy"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
