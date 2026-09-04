/**
 * Thin wrapper around the Workers Cache API for proxying upstream read-only
 * JSON endpoints. On cache miss the fetcher runs, its result is serialised
 * and stored with an explicit `Cache-Control: max-age=…`, and returned to
 * the caller. Cache writes happen via `ctx.waitUntil` so responses never
 * block on cache population.
 *
 * Cache keys should be stable synthetic URLs that don't collide with real
 * routes — build them on `CACHE_HOST` as `<host>/<feature>/<key>`.
 *
 * Notes:
 * - Workers Cache API is per-POP and best-effort; TTLs are upper bounds.
 *   Acceptable for static catalogs we're willing to serve slightly stale.
 * - Only JSON-serialisable values are supported. Non-JSON responses belong
 *   in the raw Response-based Cache API idiom.
 * - `shouldCache` exists for the derived-catalog case, where an empty result
 *   is nearly always a transient upstream failure and persisting it would
 *   freeze the outage in for the whole TTL.
 */

import type { DeferredWorkContext } from "../context";

/** Synthetic host namespacing every key, so none collides with a real route. */
export const CACHE_HOST = "https://cache.dafthunk.internal";

export async function cachedJson<T>(
  cacheKey: string,
  ttlSeconds: number,
  ctx: DeferredWorkContext,
  fetcher: () => Promise<T>,
  /** Decides whether a freshly fetched value is worth storing. Default: yes. */
  shouldCache: (value: T) => boolean = () => true
): Promise<T> {
  const request = new Request(cacheKey);
  const cache = caches.default;

  const hit = await cache.match(request);
  if (hit) {
    return (await hit.json()) as T;
  }

  const fresh = await fetcher();
  if (!shouldCache(fresh)) return fresh;

  // Not cloned: nothing reads the response after this, so teeing the body
  // would hold a second copy of the payload for no reader.
  const response = new Response(JSON.stringify(fresh), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${ttlSeconds}`,
    },
  });
  ctx.waitUntil(cache.put(request, response));
  return fresh;
}
