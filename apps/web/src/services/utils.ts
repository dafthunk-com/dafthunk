import { getApiBaseUrl } from "@/config/api";

/**
 * Make a generic request to the API
 */
export const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
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

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Resource not found");
    } else if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized access");
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
    // Let's assume for now that successful non-JSON responses (other than 204) are not expected by this generic util, or T would be ArrayBuffer/Blob/string.
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
