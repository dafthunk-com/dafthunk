/**
 * Per-organization cap on workflow generations.
 *
 * The shared `createRateLimitMiddleware` only counts — its handler is
 * `(_, next) => next()`, so it never rejects — and the generator DO is keyed per
 * session, which means it cannot see how many other sessions an org is running.
 * Neither can bound the cost of a feature where one request is several large
 * model calls, so this keeps a small sliding window in KV instead.
 */

import {
  RATE_LIMIT_MAX_PER_WINDOW as MAX_PER_WINDOW,
  RATE_LIMIT_WINDOW_MS as WINDOW_MS,
} from "./config";

function key(organizationId: string): string {
  return `${organizationId}:generate-window`;
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Records an attempt and reports whether it is allowed.
 *
 * Read-modify-write on KV is not atomic, so two simultaneous requests can both
 * see the same window. That is acceptable here: the cap exists to stop runaway
 * spend, not to be exact, and the dev-mode gate already bounds who can reach it.
 */
export async function checkGenerationRateLimit(
  kv: KVNamespace,
  organizationId: string,
  now: number = Date.now()
): Promise<RateLimitVerdict> {
  const raw = await kv.get(key(organizationId));
  const previous: number[] = raw ? (JSON.parse(raw) as number[]) : [];
  const window = previous.filter((at) => now - at < WINDOW_MS);

  if (window.length >= MAX_PER_WINDOW) {
    const oldest = Math.min(...window);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((WINDOW_MS - (now - oldest)) / 1000)
      ),
    };
  }

  window.push(now);
  await kv.put(key(organizationId), JSON.stringify(window), {
    expirationTtl: Math.ceil(WINDOW_MS / 1000),
  });

  return {
    allowed: true,
    remaining: MAX_PER_WINDOW - window.length,
    retryAfterSeconds: 0,
  };
}
