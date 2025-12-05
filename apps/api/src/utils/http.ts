import { BlobParameter, HttpRequest } from "../nodes/types";

export interface SimulateHttpRequestParams {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: BlobParameter;
}

/**
 * Creates a simulated HttpRequest for testing and UI-triggered HTTP workflows.
 * This matches the format expected by HTTP-triggered nodes.
 */
export function createSimulatedHttpRequest(
  params: SimulateHttpRequestParams
): HttpRequest {
  const url = params.url || "https://example.com/webhook";

  // Extract path from URL
  let path = "/webhook";
  try {
    const urlObj = new URL(url);
    path = urlObj.pathname;
  } catch {
    // If URL parsing fails, use default path
  }

  return {
    url,
    path,
    method: params.method || "POST",
    headers: params.headers || { "content-type": "application/octet-stream" },
    query: params.query || {},
    queryParams: params.query || {},
    body: params.body,
  };
}
