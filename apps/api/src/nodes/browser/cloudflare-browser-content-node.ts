import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Cloudflare Browser Rendering Content Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /content endpoint to fetch fully rendered HTML.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/content/methods/create/
 */
export class CloudflareBrowserContentNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-content",
    name: "Cloudflare Browser Content",
    type: "cloudflare-browser-content",
    description:
      "Fetch fully rendered HTML from a URL using Cloudflare Browser Rendering.",
    category: "Browser",
    icon: "globe",
    computeCost: 10,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The URL to render (required)",
        required: true,
      },
      {
        name: "rejectResourceTypes",
        type: "json",
        description: "Array of resource types to block (optional)",
        hidden: true,
      },
      {
        name: "rejectRequestPattern",
        type: "json",
        description: "Array of regex patterns to block requests (optional)",
        hidden: true,
      },
      {
        name: "allowRequestPattern",
        type: "json",
        description: "Array of regex patterns to allow requests (optional)",
        hidden: true,
      },
      {
        name: "allowResourceTypes",
        type: "json",
        description: "Array of resource types to allow (optional)",
        hidden: true,
      },
      {
        name: "setExtraHTTPHeaders",
        type: "json",
        description: "Extra HTTP headers to set (optional)",
        hidden: true,
      },
      {
        name: "cookies",
        type: "json",
        description: "Cookies to set (optional)",
        hidden: true,
      },
      {
        name: "gotoOptions",
        type: "json",
        description: "Options for page navigation (optional)",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "html",
        type: "string",
        description: "Fully rendered HTML as returned by Cloudflare",
      },
      {
        name: "status",
        type: "number",
        description: "HTTP status code from Cloudflare API",
        hidden: true,
      },
      {
        name: "error",
        type: "string",
        description: "Error message if the request fails",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const {
      url,
      rejectResourceTypes,
      rejectRequestPattern,
      allowRequestPattern,
      allowResourceTypes,
      setExtraHTTPHeaders,
      cookies,
      gotoOptions,
    } = context.inputs;

    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;

    if (!url || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return this.createErrorResult(
        "'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required."
      );
    }

    // Build request body
    const body: Record<string, unknown> = { url };
    if (rejectResourceTypes) body.rejectResourceTypes = rejectResourceTypes;
    if (rejectRequestPattern) body.rejectRequestPattern = rejectRequestPattern;
    if (allowRequestPattern) body.allowRequestPattern = allowRequestPattern;
    if (allowResourceTypes) body.allowResourceTypes = allowResourceTypes;
    if (setExtraHTTPHeaders) body.setExtraHTTPHeaders = setExtraHTTPHeaders;
    if (cookies) body.cookies = cookies;
    if (gotoOptions) body.gotoOptions = gotoOptions;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const status = response.status;
      const json: any = await response.json();

      if (!response.ok || !json.status) {
        const errorMsg =
          (json.errors && json.errors[0]?.message) || response.statusText;
        return this.createErrorResult(
          `Cloudflare API error: ${status} - ${errorMsg}`
        );
      }

      // The HTML content is in json.result
      const html = typeof json.result === "string" ? json.result : null;
      if (!html) {
        return this.createErrorResult(
          "Cloudflare API error: No content returned"
        );
      }
      return this.createSuccessResult({
        status,
        html,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
