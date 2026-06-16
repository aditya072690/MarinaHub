import type { AddonCatalogItem } from "@/types/database";

export function normalizeAddonIds(addonIds: string[]): string[] {
  return [...new Set(addonIds)];
}

export function calculateAddonsTotal(
  addonIds: string[],
  catalog: Pick<AddonCatalogItem, "id" | "price">[]
): number {
  const uniqueIds = normalizeAddonIds(addonIds);
  if (uniqueIds.length === 0) return 0;

  const priceMap = new Map(catalog.map((a) => [a.id, Number(a.price)]));
  let total = 0;

  for (const id of uniqueIds) {
    const price = priceMap.get(id);
    if (price !== undefined) {
      total += price;
    }
  }

  return Math.round(total * 100) / 100;
}

/** Validates server-side that every requested id resolved to an active catalog row. */
export function validateAddonSelection(
  addonIds: string[],
  catalog: Pick<AddonCatalogItem, "id">[]
): { valid: boolean; error?: string } {
  const uniqueIds = normalizeAddonIds(addonIds);
  if (uniqueIds.length === 0) return { valid: true };

  const catalogIds = new Set(catalog.map((a) => a.id));
  const invalid = uniqueIds.filter((id) => !catalogIds.has(id));
  if (invalid.length > 0) {
    return { valid: false, error: "One or more add-ons are invalid or unavailable" };
  }
  return { valid: true };
}
