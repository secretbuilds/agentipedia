/**
 * Shared in-memory rate limiter.
 *
 * Uses a sliding-window approach backed by a Map of timestamps.
 * Each limiter instance is independent so different actions can have
 * different windows and thresholds.
 *
 * Acceptable for V1 (single-process). Replace with Redis for
 * multi-instance deployments.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  readonly maxRequests: number;
  /** Window size in milliseconds. */
  readonly windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed (false = rate-limited). */
  readonly allowed: boolean;
  /** Number of remaining requests in the current window. */
  readonly remaining: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Maximum number of distinct keys before the map is cleared to prevent
 * unbounded memory growth (e.g. from spoofed identifiers).
 */
const MAX_MAP_ENTRIES = 10_000;

export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;
  const store = new Map<string, readonly number[]>();

  /**
   * Check and record a request for `key`.
   *
   * Returns whether the request is allowed and how many requests remain.
   * Does NOT mutate existing arrays — creates new ones each time.
   */
  function check(key: string): RateLimitResult {
    // Evict all entries if the map grows too large (prevents memory leak)
    if (store.size > MAX_MAP_ENTRIES) {
      store.clear();
    }

    const now = Date.now();
    const cutoff = now - windowMs;
    const existing = store.get(key) ?? [];

    // Keep only timestamps within the window (immutable — new array)
    const recent = existing.filter((ts) => ts > cutoff);

    if (recent.length >= maxRequests) {
      // Over limit — store pruned list but don't record this request
      store.set(key, recent);
      return { allowed: false, remaining: 0 };
    }

    // Record this request (new array, no mutation)
    store.set(key, [...recent, now]);
    return { allowed: true, remaining: maxRequests - recent.length - 1 };
  }

  return { check };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for server actions
// ---------------------------------------------------------------------------

/**
 * General mutation limiter: 10 requests per minute.
 * Suitable for createHypothesis, updateHypothesis, submitRun, deleteHypothesis, deleteRun.
 */
export const mutationLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * PAT creation limiter: 5 requests per minute.
 * Tighter because tokens are sensitive credentials.
 */
export const patLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
});
