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

  if (contentType?.includes("application/json")) {
    const contentLength = c.req.header("content-length");
    if (contentLength && contentLength !== "0") {
      try {
        body = await c.req.json();
      } catch (e: any) {
        console.error("Failed to parse JSON request body:", e.message);
        return {
          error: "Invalid JSON in request body.",
          details: e.message,
        };
      }
    } else {
      // Content-Type is application/json but body is empty or content-length is 0
      body = {};
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
