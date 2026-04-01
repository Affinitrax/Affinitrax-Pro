/**
 * Lightweight in-memory rate limiter.
 *
 * Works on a per-serverless-instance basis. For a single-instance or
 * low-traffic deployment this is sufficient. If you scale to many concurrent
 * Vercel regions you can swap the Map for an Upstash Redis KV store with the
 * same interface.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth
let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 5 * 60 * 1000) return;
  lastPrune = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * @param key       Unique key — typically `"${route}:${ip}"`
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 * @returns `allowed: false` when the limit is exceeded
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  maybePrune();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/** Extract the best available client IP from a Next.js Request */
export function getClientIp(req: Request): string {
  const headers = [
    "x-real-ip",
    "x-forwarded-for",
    "cf-connecting-ip", // Cloudflare
  ];
  for (const h of headers) {
    const val = (req as Request & { headers: Headers }).headers.get(h);
    if (val) return val.split(",")[0].trim();
  }
  return "unknown";
}
