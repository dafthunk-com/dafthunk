import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Cloudflare Browser Rendering Links Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /links endpoint to fetch all links from a rendered page.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/links/
 */
export class CloudflareBrowserLinksNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-links",
    name: "Cloudflare Browser Links",
    type: "cloudflare-browser-links",
    description:
      "Fetch all links from a rendered page using Cloudflare Browser Rendering.",
    category: "Net",
    icon: "link",
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The URL to render (required)",
        required: true,
      },
      {
        name: "html",
        type: "string",
        description:
          "HTML content to render instead of navigating to a URL (optional)",
      },
      {
        name: "gotoOptions",
        type: "json",
        description: "Options for page navigation (optional)",
        hidden: true,
      },
      {
        name: "waitForSelector",
        type: "string",
        description: "Wait for selector before extracting (optional)",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "links",
        type: "json",
        description: "Array of links as returned by Cloudflare",
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
    const { url, html, gotoOptions, waitForSelector } = context.inputs;

    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;

    if (!url || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return this.createErrorResult(
        "'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required."
      );
    }

    // Build request body
    const body: Record<string, unknown> = { url };
    if (html) body.html = html;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/links`;

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
      console.log("Cloudflare API response:", json);

      // Only treat as error if HTTP is not ok, or errors array is present and non-empty
      if (
        !response.ok ||
        (Array.isArray(json.errors) && json.errors.length > 0)
      ) {
        const errorMsg =
          (json.errors && json.errors[0]?.message) || response.statusText;
        return this.createErrorResult(
          `Cloudflare API error: ${status} - ${errorMsg}`
        );
      }

      // The links are in json.result (should be an array of strings)
      if (!Array.isArray(json.result)) {
        return this.createErrorResult(
          "Cloudflare API error: No links array returned"
        );
      }
      return this.createSuccessResult({
        status,
        links: json.result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
