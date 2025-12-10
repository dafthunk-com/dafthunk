import { NodeExecution, NodeType } from "@dafthunk/types";

import { calculateBrowserUsage } from "../../utils/usage";
import { ExecutableNode, NodeContext } from "../types";

/**
 * Cloudflare Browser Rendering Markdown Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /markdown endpoint to fetch markdown from a rendered page.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/markdown/
 */
export class CloudflareBrowserMarkdownNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-markdown",
    name: "Browser Markdown",
    type: "cloudflare-browser-markdown",
    description:
      "Fetch markdown from a rendered page using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "Markdown"],
    icon: "file-text",
    documentation:
      "Converts web pages to Markdown format. Either url or html is required (not both). See [Cloudflare Browser Rendering Markdown Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/markdown-endpoint/) for details.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "url",
        type: "string",
        description:
          "The URL to render (either url or html required, not both)",
      },
      {
        name: "html",
        type: "string",
        description:
          "HTML content to render (either url or html required, not both)",
      },
      {
        name: "rejectRequestPattern",
        type: "json",
        description: "Array of regex patterns to block requests",
        hidden: true,
      },
      {
        name: "gotoOptions",
        type: "json",
        description: "Page navigation options",
        hidden: true,
      },
      {
        name: "waitForSelector",
        type: "json",
        description: "Selector to wait for before extraction",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "markdown",
        type: "string",
        description: "Markdown as returned by Cloudflare",
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
    const startTime = Date.now();
    const { url, html, rejectRequestPattern, gotoOptions, waitForSelector } =
      context.inputs;

    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return this.createErrorResult(
        "'CLOUDFLARE_ACCOUNT_ID' and 'CLOUDFLARE_API_TOKEN' are required."
      );
    }

    if (!url && !html) {
      return this.createErrorResult("Either 'url' or 'html' is required.");
    }

    if (url && html) {
      return this.createErrorResult(
        "Cannot use both 'url' and 'html' at the same time."
      );
    }

    // Build request body
    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (rejectRequestPattern) body.rejectRequestPattern = rejectRequestPattern;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`;

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

      // The markdown is in json.result (should be a string)
      if (typeof json.result !== "string") {
        return this.createErrorResult(
          "Cloudflare API error: No markdown string returned"
        );
      }
      const usage = calculateBrowserUsage(Date.now() - startTime);

      return this.createSuccessResult({ status, markdown: json.result }, usage);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
