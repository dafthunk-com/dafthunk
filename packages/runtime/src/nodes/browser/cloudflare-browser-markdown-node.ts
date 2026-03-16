import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingJson,
  validateBrowserInputs,
} from "./browser-rendering-api";

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
    const validationError = validateBrowserInputs(this, context);
    if (validationError) return validationError;

    const startTime = Date.now();
    const { url, html, rejectRequestPattern, gotoOptions, waitForSelector } =
      context.inputs;

    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (rejectRequestPattern) body.rejectRequestPattern = rejectRequestPattern;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const result = await fetchBrowserRenderingJson(
      context,
      "markdown",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    if (typeof result.json.result !== "string") {
      return this.createErrorResult(
        "Cloudflare API error: No markdown string returned"
      );
    }

    return this.createSuccessResult(
      { markdown: result.json.result, status: result.status },
      result.usage
    );
  }
}
