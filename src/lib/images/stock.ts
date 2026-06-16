export const DEFAULT_BOAT_IMAGE =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80";

const BROKEN_BOAT_IMAGES = new Set([
  "https://images.unsplash.com/photo-1605281317010-fe6ffe85f283?w=800&q=80",
  "https://images.unsplash.com/photo-1605281317010-fe6ffe85f283?w=1200&q=80",
  "https://images.unsplash.com/photo-1605281317010-fe6ffe85f283",
]);

export function resolveBoatImageUrl(url?: string | null): string {
  if (!url || BROKEN_BOAT_IMAGES.has(url)) return DEFAULT_BOAT_IMAGE;
  return url;
}
