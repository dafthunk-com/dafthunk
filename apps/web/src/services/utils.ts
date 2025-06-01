import { getApiBaseUrl } from "@/config/api";

// Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the access token using the refresh token
 * This is a standalone function to avoid circular dependencies
 */
const refreshAccessToken = async (): Promise<boolean> => {
  if (isRefreshing && refreshPromise) {
    // If already refreshing, wait for the existing refresh to complete
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await makeRequest<{ success: boolean }>(
        "/auth/refresh",
        {
          method: "POST",
        },
        true // Skip refresh to avoid infinite loops
      );

      return response.success === true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Make a generic request to the API
 */
export const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  skipRefresh = false
): Promise<T> => {
  const fullUrl = `${getApiBaseUrl()}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // If body is FormData, remove Content-Type to let the browser set it with boundary
  if (options.body instanceof FormData) {
    delete defaultHeaders["Content-Type"];
  }

  const requestOptions: RequestInit = {
    ...options, // Spread incoming options first
    headers: {
      ...defaultHeaders,
      ...options.headers, // Then spread specific headers from options, allowing override
    },
    credentials: options.credentials || "include",
  };

  const response = await fetch(fullUrl, requestOptions);

  // Check if token refresh is needed (only for successful requests)
  if (
    !skipRefresh &&
    response.ok &&
    response.headers.get("X-Token-Refresh-Needed") === "true"
  ) {
    // Trigger refresh in the background, don't wait for it
    refreshAccessToken().catch((error) => {
      console.error("Background token refresh failed:", error);
    });
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Resource not found");
    } else if (response.status === 401 && !skipRefresh) {
      // Try to refresh token once if we get 401
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        // Retry the original request with the new token
        const retryResponse = await fetch(fullUrl, requestOptions);
        if (retryResponse.ok) {
          // Handle successful retry response
          if (retryResponse.status === 204) {
            return undefined as T;
          }
          const contentType = retryResponse.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            return undefined as T;
          }
          return retryResponse.json();
        }
      }
      throw new Error("Unauthorized access");
    } else if (response.status === 401) {
      throw new Error("Unauthorized access");
    } else if (response.status === 403) {
      throw new Error("Forbidden access");
    }
    // Attempt to parse error response body if available
    try {
      const errorData = await response.json();
      // Assuming errorData has a 'message' or similar property
      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        `Request failed with status: ${response.status}`;
      throw new Error(errorMessage);
    } catch (_e) {
      // Fallback if error response is not JSON or other parsing error
      throw new Error(`Request failed with status: ${response.status}`);
    }
  }

  // Handle responses that are OK but might not have a JSON body
  if (response.status === 204) {
    return undefined as T; // Or handle as appropriate for your expected T types
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    // If content type is not JSON, or not present, and status is not 204 (handled above)
    // consider what to return. For now, assuming it might be an issue or should be specifically handled by callers.
    // If T can be string for text responses, this needs more sophisticated handling.
    // For now, if it's not JSON and not 204, we'll assume it's an unexpected success scenario or should be handled by `response.text()` if needed.
    // To keep it simple and address the core issue of .json() failing:
    return undefined as T; // Or throw an error if non-JSON successful responses are unexpected
  }

  return response.json();
};

/**
 * Make a request to the API with organization context
 */
export const makeOrgRequest = async <T>(
  orgHandle: string,
  resourcePath: string,
  endpoint: string = "",
  options: RequestInit = {}
): Promise<T> => {
  const fullEndpoint = `/${orgHandle}${resourcePath}${endpoint}`;
  return makeRequest<T>(fullEndpoint, options);
};
