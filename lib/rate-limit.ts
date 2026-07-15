/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Keyed by an arbitrary string (typically client IP). State lives in a module
 * Map, so it is per-process — adequate for a single Node.js instance (the Proxy
 * runtime), and intentionally not shared across instances. Swap for a shared
 * store (Redis/Upstash) if the deployment scales horizontally.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

export const DEFAULT_RATE_LIMIT = 100;
export const DEFAULT_WINDOW_MS = 60_000;

export function rateLimit(
  key: string,
  limit: number = DEFAULT_RATE_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/** Best-effort client IP from proxy headers, falling back to a shared bucket. */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') ?? 'unknown';
}

/** Test-only: clear all rate-limit state. */
export function __resetRateLimitStore(): void {
  store.clear();
}
