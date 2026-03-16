import type { NodeContext } from "@dafthunk/runtime";
import type { NodeExecution } from "@dafthunk/types";
import { calculateBrowserUsage } from "../../utils/usage";

interface BrowserRenderingNode {
  createSuccessResult: (
    outputs: Record<string, unknown>,
    usage: number
  ) => NodeExecution;
  createErrorResult: (error: string) => NodeExecution;
}

/**
 * Validates Cloudflare Browser Rendering credentials and the url/html
 * mutual-exclusion rule. Returns an error result if invalid, or
 * undefined if validation passes.
 */
export function validateBrowserInputs(
  node: BrowserRenderingNode,
  context: NodeContext
): NodeExecution | undefined {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    return node.createErrorResult(
      "'CLOUDFLARE_ACCOUNT_ID' and 'CLOUDFLARE_API_TOKEN' are required."
    );
  }

  const { url, html } = context.inputs;

  if (!url && !html) {
    return node.createErrorResult("Either 'url' or 'html' is required.");
  }

  if (url && html) {
    return node.createErrorResult(
      "Cannot use both 'url' and 'html' at the same time."
    );
  }

  return undefined;
}

/**
 * Calls the Cloudflare Browser Rendering REST API and returns the
 * parsed JSON response. Handles auth headers, error extraction, and
 * usage calculation.
 */
export async function fetchBrowserRenderingJson(
  context: NodeContext,
  endpoint: string,
  body: Record<string, unknown>,
  startTime: number
): Promise<{ json: any; status: number; usage: number } | { error: string }> {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const status = response.status;
    const json: any = await response.json();

    if (
      !response.ok ||
      (Array.isArray(json.errors) && json.errors.length > 0)
    ) {
      const errorMsg = json.errors?.[0]?.message || response.statusText;
      return { error: `Cloudflare API error: ${status} - ${errorMsg}` };
    }

    const usage = calculateBrowserUsage(Date.now() - startTime);
    return { json, status, usage };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Calls the Cloudflare Browser Rendering REST API and returns the
 * raw binary response. Used by screenshot/pdf endpoints that return
 * binary data instead of JSON.
 */
export async function fetchBrowserRenderingBinary(
  context: NodeContext,
  endpoint: string,
  body: Record<string, unknown>,
  startTime: number
): Promise<
  { data: Uint8Array; status: number; usage: number } | { error: string }
> {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `Cloudflare API error: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    if (data.length === 0) {
      return { error: "Cloudflare API error: No data returned" };
    }

    const usage = calculateBrowserUsage(Date.now() - startTime);
    return { data, status: response.status, usage };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
