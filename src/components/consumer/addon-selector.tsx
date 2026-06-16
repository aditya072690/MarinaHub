"use client";

import { formatCurrency } from "@/lib/currency/format";
import type { AddonCatalogItem } from "@/types/database";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function AddonSelector({
  catalog,
  selectedIds,
  onChange,
}: {
  catalog: AddonCatalogItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (catalog.length === 0) return null;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Add-ons</p>
      <div className="space-y-2">
        {catalog.map((addon) => (
          <label
            key={addon.id}
            className={cn(
              "flex min-h-[44px] cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors",
              selectedIds.includes(addon.id) && "border-sky-300 bg-sky-50"
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.includes(addon.id)}
                onCheckedChange={() => toggle(addon.id)}
              />
              <div>
                <Label className="cursor-pointer font-medium">{addon.name}</Label>
                {addon.description && (
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                )}
              </div>
            </div>
            <span className="font-semibold">{formatCurrency(Number(addon.price))}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
