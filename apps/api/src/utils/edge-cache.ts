/**
 * Thin wrapper around the Workers Cache API for proxying upstream read-only
 * JSON endpoints. On cache miss the fetcher runs, its result is serialised
 * and stored with an explicit `Cache-Control: max-age=…`, and returned to
 * the caller. Cache writes happen via `ctx.waitUntil` so responses never
 * block on cache population.
 *
 * Cache keys should be stable synthetic URLs that don't collide with real
 * routes — conventionally `https://cache.dafthunk.internal/<feature>/<key>`.
 *
 * Notes:
 * - Workers Cache API is per-POP and best-effort; TTLs are upper bounds.
 *   Acceptable for static catalogs we're willing to serve slightly stale.
 * - Only JSON-serialisable values are supported. Non-JSON responses belong
 *   in the raw Response-based Cache API idiom.
 */
export async function cachedJson<T>(
  cacheKey: string,
  ttlSeconds: number,
  ctx: ExecutionContext,
  fetcher: () => Promise<T>
): Promise<T> {
  const request = new Request(cacheKey);
  const cache = caches.default;

  const hit = await cache.match(request);
  if (hit) {
    return (await hit.json()) as T;
  }

  const fresh = await fetcher();
  const response = new Response(JSON.stringify(fresh), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${ttlSeconds}`,
    },
  });
  ctx.waitUntil(cache.put(request, response.clone()));
  return fresh;
}
