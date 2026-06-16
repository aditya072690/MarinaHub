import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memoryStore = new Map<string, { count: number; resetAt: number }>();
const limiterCache = new Map<string, Ratelimit>();

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const cacheKey = `${limit}:${windowMs}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: "marinahub",
    analytics: false,
  });

  limiterCache.set(cacheKey, ratelimit);
  return ratelimit;
}

/**
 * Distributed rate limit when Upstash is configured; in-memory fallback for local dev.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getLimiter(limit, windowMs);

  if (!limiter) {
    return memoryRateLimit(key, limit, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    return { success: result.success, remaining: result.remaining };
  } catch {
    return memoryRateLimit(key, limit, windowMs);
  }
}

export function getClientIp(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}

export function getClientIpFromHeaders(
  headers: Headers | { get(name: string): string | null }
): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
