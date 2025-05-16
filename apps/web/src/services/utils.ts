import { API_BASE_URL } from "@/config/api";

/**
 * Make a generic request to the API
 */
export const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;

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
    throw new Error(`Request failed with status: ${response.status}`);
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
