import { cn } from "@/lib/utils";
import Link from "next/link";

export type DashboardFilterChip = {
  value: string;
  label: string;
  href: string;
};

export function DashboardFilterChips({
  chips,
  activeValue,
}: {
  chips: DashboardFilterChip[];
  activeValue: string;
}) {
  return (
    <div className="dash-filter-chips" role="group" aria-label="Filter options">
      {chips.map((chip) => {
        const isActive = chip.value === activeValue;
        return (
          <Link
            key={chip.value}
            href={chip.href}
            className={cn(
              "dash-filter-chip",
              isActive && "dash-filter-chip--active"
            )}
            aria-current={isActive ? "true" : undefined}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}

export function buildFilterHref(
  basePath: string,
  current: Record<string, string | undefined>,
  filterKey: string,
  filterValue: string,
  allValue = "all"
) {
  const params = new URLSearchParams();
  Object.entries(current).forEach(([key, val]) => {
    if (!val || key === "cursor" || key === filterKey) return;
    params.set(key, val);
  });
  if (filterValue !== allValue) params.set(filterKey, filterValue);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
