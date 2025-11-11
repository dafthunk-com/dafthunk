/**
 * Request Parser Utility
 *
 * Centralized request body and form data parsing with error handling.
 */

import type { Context } from "hono";

import { processFormData } from "./http";

export interface ParsedRequest {
  body?: any;
  formData?: Record<string, string>;
}

export interface ParseRequestError {
  error: string;
  details?: string;
}

/**
 * Parse request body based on content-type
 * Handles JSON, form-data, and multipart content types
 *
 * @returns ParsedRequest on success, ParseRequestError on failure
 */
export async function parseRequestBody(
  c: Context
): Promise<ParsedRequest | ParseRequestError> {
  let body: any = undefined;
  let formData: Record<string, string> | undefined;

  const contentType = c.req.header("content-type");
  const contentLength = c.req.header("content-length");

  // Check if there's actually a body to parse
  if (!contentLength || contentLength === "0") {
    return { body: undefined, formData: undefined };
  }

  if (contentType?.includes("application/json")) {
    try {
      body = await c.req.json();
    } catch (e: any) {
      console.error("Failed to parse JSON request body:", e.message);
      return {
        error: "Invalid JSON in request body.",
        details: e.message,
      };
    }
  } else if (
    contentType?.includes("multipart/form-data") ||
    contentType?.includes("application/x-www-form-urlencoded")
  ) {
    try {
      const rawFormData = Object.fromEntries(await c.req.formData());
      // Filter out File objects - only keep string values
      formData = Object.fromEntries(
        Object.entries(rawFormData).filter(
          ([_, value]) => typeof value === "string"
        )
      ) as Record<string, string>;
      // Convert form data to body with type coercion
      body = processFormData(formData);
    } catch (e: any) {
      console.error("Failed to parse form data:", e.message);
      return {
        error: "Invalid form data in request body.",
        details: e.message,
      };
    }
  } else if (
    contentType?.includes("text/plain") ||
    contentType?.includes("text/xml") ||
    contentType?.includes("application/xml") ||
    contentType?.includes("text/html") ||
    contentType?.includes("application/octet-stream")
  ) {
    // For raw text, XML, HTML, or binary content, read as text/string
    try {
      body = await c.req.text();
    } catch (e: any) {
      console.error("Failed to parse raw request body:", e.message);
      return {
        error: "Invalid request body.",
        details: e.message,
      };
    }
  } else {
    // For unknown content types, try to parse as JSON first, then as text
    try {
      body = await c.req.json();
    } catch {
      try {
        body = await c.req.text();
      } catch (e: any) {
        console.error("Failed to parse request body:", e.message);
        return {
          error: "Invalid request body.",
          details: e.message,
        };
      }
    }
  }

  return { body, formData };
}

/**
 * Check if a parsed request result is an error
 */
export function isParseError(
  result: ParsedRequest | ParseRequestError
): result is ParseRequestError {
  return "error" in result;
}
