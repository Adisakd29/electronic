/**
 * Tiny in-memory fixed-window rate limiter (per server instance).
 * Used for sign-in attempts made through Server Actions (better-auth's own
 * limiter only covers requests that go through /api/auth/*).
 */
const buckets = new Map<string, { count: number; reset: number }>();

/** Returns false when `key` exceeded `max` hits within `windowMs`. */
export function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= max;
}
