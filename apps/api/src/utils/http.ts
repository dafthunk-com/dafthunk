import { BlobParameter, HttpRequest } from "../nodes/types";

export interface SimulateHttpRequestParams {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  formData?: Record<string, string>;
}

/**
 * Processes form data by converting string values to appropriate types (boolean, number).
 * This matches the behavior in workflows.ts for form data type coercion.
 */
export function processFormData(
  formData: Record<string, string>
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(formData).map(([key, value]) => {
      // Try to parse numbers and booleans
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") return [key, true];
        if (value.toLowerCase() === "false") return [key, false];
        if (!isNaN(Number(value))) return [key, Number(value)];
      }
      return [key, value];
    })
  );
}

/**
 * Processes WebSocket parameters for HTTP workflows, extracting body and formData.
 * Handles special parameter keys (jsonBody) and treats remaining params as form data.
 */
export function processHttpParameters(parameters: Record<string, any>): {
  body: any;
  formData: Record<string, string> | undefined;
} {
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Object.keys(parameters).length === 0
  ) {
    return { body: undefined, formData: undefined };
  }

  // Check for explicit jsonBody parameter
  if ("jsonBody" in parameters) {
    // When jsonBody is present, use it as the body (don't treat as form data)
    return {
      body: parameters.jsonBody,
      formData: undefined,
    };
  }

  // Otherwise, treat all parameters as form data
  const formData = parameters as Record<string, string>;
  const body = processFormData(formData);

  return {
    body,
    formData,
  };
}

/**
 * Converts a body value to a BlobParameter with appropriate MIME type.
 */
function bodyToBlobParameter(
  body: any,
  contentType: string
): BlobParameter | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  // If body is already a BlobParameter, return it
  if (
    typeof body === "object" &&
    "data" in body &&
    body.data instanceof Uint8Array &&
    "mimeType" in body
  ) {
    return body as BlobParameter;
  }

  // Convert body to bytes based on content type
  let bytes: Uint8Array;
  let mimeType = contentType;

  if (typeof body === "string") {
    bytes = new TextEncoder().encode(body);
    if (!mimeType) {
      mimeType = "text/plain";
    }
  } else if (body instanceof Uint8Array) {
    bytes = body;
    if (!mimeType) {
      mimeType = "application/octet-stream";
    }
  } else if (body instanceof ArrayBuffer) {
    bytes = new Uint8Array(body);
    if (!mimeType) {
      mimeType = "application/octet-stream";
    }
  } else {
    // Assume JSON object
    bytes = new TextEncoder().encode(JSON.stringify(body));
    if (!mimeType) {
      mimeType = "application/json";
    }
  }

  return {
    data: bytes,
    mimeType,
  };
}

/**
 * Creates a simulated HttpRequest for testing and UI-triggered HTTP workflows.
 * This matches the format expected by HTTP-triggered nodes.
 */
export function createSimulatedHttpRequest(
  params: SimulateHttpRequestParams
): HttpRequest {
  const url = params.url || "https://example.com/webhook";
  const contentType = params.headers?.["content-type"] || "application/json";

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
    headers: params.headers || { "content-type": "application/json" },
    query: params.query || {},
    queryParams: params.query || {},
    body: bodyToBlobParameter(params.body, contentType),
    formData: params.formData,
  };
}
