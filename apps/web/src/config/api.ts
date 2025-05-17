let apiBaseUrlSingleton: string | undefined;
const DEFAULT_API_HOST = "http://localhost:3001";

/**
 * Initializes the API base URL. This function MUST be called once at the application startup
 * in the appropriate entry point (client or server).
 * @param urlFromEnv - The API base URL from the specific environment (Vite or Cloudflare).
 *                     If undefined, it will try to use Vite's env vars (if on client) or default.
 */
export function initializeApiBaseUrl(urlFromEnv?: string): void {
  if (apiBaseUrlSingleton !== undefined) {
    return;
  }

  if (urlFromEnv) {
    apiBaseUrlSingleton = urlFromEnv;
  } else if (
    typeof import.meta.env !== "undefined" &&
    import.meta.env.VITE_API_HOST
  ) {
    apiBaseUrlSingleton = import.meta.env.VITE_API_HOST;
  } else {
    apiBaseUrlSingleton = DEFAULT_API_HOST;
  }
}

/**
 * Retrieves the API base URL.
 * It's crucial that initializeApiBaseUrl has been called from the server entry
 *  point before this function is used.
 * @returns The configured API base URL.
 */
export function getApiBaseUrl(): string {
  if (apiBaseUrlSingleton === undefined) {
    initializeApiBaseUrl(); // Pass undefined, will use Vite env or default.
  }
  return apiBaseUrlSingleton!;
}
