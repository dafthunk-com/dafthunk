import { HttpRequest } from "../nodes/types";

export interface SimulateHttpRequestParams {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  formData?: Record<string, string | File>;
}

/**
 * Processes form data by converting string values to appropriate types (boolean, number).
 * This matches the behavior in workflows.ts for form data type coercion.
 */
export function processFormData(
  formData: Record<string, string | File>
): Record<string, string | number | boolean | File> {
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
  formData: Record<string, string | File> | undefined;
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
 * Creates a simulated HttpRequest for testing and UI-triggered HTTP workflows.
 * This matches the format expected by HTTP-triggered nodes.
 */
export function createSimulatedHttpRequest(
  params: SimulateHttpRequestParams
): HttpRequest {
  return {
    url: params.url || "https://example.com/webhook",
    method: params.method || "POST",
    headers: params.headers || { "content-type": "application/json" },
    query: params.query || {},
    body: params.body,
    formData: params.formData,
  };
}
