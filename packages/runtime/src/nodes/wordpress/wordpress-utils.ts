/**
 * Shared helpers for WordPress.com REST API nodes.
 *
 * All nodes hit the WP REST API v2 mirror at
 * `https://public-api.wordpress.com/wp/v2/sites/{site}/...` where {site} is
 * either the site host (e.g. `example.wordpress.com`) or the numeric blog ID.
 */

export interface WordPressIntegrationMetadata {
  userId?: number;
  username?: string;
  displayName?: string;
  email?: string;
  primaryBlogId?: number;
  primaryBlogUrl?: string;
  avatarUrl?: string;
}

/**
 * Resolve which WordPress site to target. Caller-supplied `override` wins;
 * otherwise we fall back to the user's primary blog from integration metadata.
 *
 * Returns `null` if no site can be determined — nodes should surface an actionable
 * error in that case.
 */
export function resolveWordPressSite(
  integration: { metadata?: Record<string, unknown> },
  override?: string
): string | null {
  if (override && override.length > 0) {
    return override;
  }
  const meta = integration.metadata as WordPressIntegrationMetadata | undefined;
  if (!meta) {
    return null;
  }

  if (typeof meta.primaryBlogUrl === "string" && meta.primaryBlogUrl) {
    try {
      return new URL(meta.primaryBlogUrl).host;
    } catch {
      // fall through
    }
  }
  if (meta.primaryBlogId !== undefined && meta.primaryBlogId !== null) {
    return String(meta.primaryBlogId);
  }
  return null;
}

/**
 * Build a WP REST API URL for a site, optionally with query params.
 *
 * Defaults to the v2 mirror (`/wp/v2/sites/{site}/...`) which exposes the
 * standard WP REST API. Pass `apiVersion: "v1.1"` to hit the legacy WP.com
 * endpoints (`/rest/v1.1/sites/{site}/...`) — those are needed for site-level
 * info and a few endpoints that v2 doesn't mirror.
 */
export function wordPressApiUrl(
  site: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: { apiVersion?: "v2" | "v1.1" }
): string {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  const apiVersion = options?.apiVersion ?? "v2";
  const base =
    apiVersion === "v2"
      ? `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(site)}/`
      : `https://public-api.wordpress.com/rest/v1.1/sites/${encodeURIComponent(site)}/`;
  const url = new URL(`${base}${trimmed}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}
