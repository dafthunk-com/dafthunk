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
    // This fallback is mainly for client-side if initializeApiBaseUrl was called without an arg,
    // or if getApiBaseUrl is called before explicit initialization on client.
    apiBaseUrlSingleton = import.meta.env.VITE_API_HOST;
  } else {
    apiBaseUrlSingleton = DEFAULT_API_HOST;
  }
  // console.log(`API Base URL initialized to: "${apiBaseUrlSingleton}"`);
}

/**
 * Retrieves the API base URL.
 * It's crucial that initializeApiBaseUrl has been called from the respective
 * application entry point (client or server) before this function is used.
 * @returns The configured API base URL.
 */
export function getApiBaseUrl(): string {
  if (apiBaseUrlSingleton === undefined) {
    // This indicates that initializeApiBaseUrl was not called as expected.
    // This could happen if a module calls getApiBaseUrl at the top level before entry points run.
    // For robustness in such edge cases (though ideally avoided by design):
    // console.warn("getApiBaseUrl() called before explicit initializeApiBaseUrl(). Attempting to self-initialize. Review call order.");
    // Attempt a self-initialization. For server, this will use DEFAULT_API_HOST unless VITE_API_HOST was somehow globally available (not standard for CF Workers).
    // For client, it will pick up import.meta.env.VITE_API_HOST if available.
    initializeApiBaseUrl(); // Pass undefined, will use Vite env or default.
  }
  // apiBaseUrlSingleton is guaranteed to be set by the logic above or by prior explicit initialization.
  return apiBaseUrlSingleton!;
}
