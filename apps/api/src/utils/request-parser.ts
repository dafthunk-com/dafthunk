/**
 * Request Parser Utility
 *
 * Preserves raw request body as BlobParameter for untransformed HTTP representation.
 */

import type { Context } from "hono";

import type { BlobParameter } from "@dafthunk/runtime";

export interface ParsedRequest {
  body?: BlobParameter;
}

export interface ParseRequestError {
  error: string;
  details?: string;
}

/**
 * Parse request body as raw BlobParameter
 * Preserves the original body bytes and content-type without transformation
 *
 * @returns ParsedRequest on success, ParseRequestError on failure
 */
export async function parseRequestBody(
  c: Context
): Promise<ParsedRequest | ParseRequestError> {
  const contentType =
    c.req.header("content-type") || "application/octet-stream";

  try {
    const arrayBuffer = await c.req.arrayBuffer();

    // Return undefined body if empty
    if (arrayBuffer.byteLength === 0) {
      return { body: undefined };
    }

    const body: BlobParameter = {
      data: new Uint8Array(arrayBuffer),
      mimeType: contentType,
    };
    return { body };
  } catch (e: any) {
    console.error("Failed to read request body:", e.message);
    return {
      error: "Failed to read request body.",
      details: e.message,
    };
  }
}

/**
 * Check if a parsed request result is an error
 */
export function isParseError(
  result: ParsedRequest | ParseRequestError
): result is ParseRequestError {
  return "error" in result;
}
