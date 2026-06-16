/** Demo widget API keys — match scripts/seed-data.ts DEMO_WIDGET_KEYS */

const DEMO_KEYS: Record<string, string | undefined> = {
  "state-park-marina": process.env.DEMO_WIDGET_API_KEY_STATE_PARK ?? "mh_demo_statepark_2026_key",
  "the-harbor": process.env.DEMO_WIDGET_API_KEY_HARBOR ?? "mh_demo_harbor_2026_key",
  "big-cedar-marina": process.env.DEMO_WIDGET_API_KEY_BIG_CEDAR ?? "mh_demo_bigcedar_2026_key",
  "lake-murray-marina": process.env.DEMO_WIDGET_API_KEY_LAKE_MURRAY ?? "mh_demo_lakemurray_2026_key",
};

export function getDemoWidgetKey(marinaSlug: string): string | null {
  return DEMO_KEYS[marinaSlug] ?? null;
}
