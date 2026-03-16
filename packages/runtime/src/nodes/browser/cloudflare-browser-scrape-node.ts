import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingJson,
  validateBrowserInputs,
} from "./browser-rendering-api";

/**
 * Cloudflare Browser Rendering Scrape Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /scrape endpoint to scrape elements from a rendered page.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/scrape/
 */
export class CloudflareBrowserScrapeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-scrape",
    name: "Browser Scrape",
    type: "cloudflare-browser-scrape",
    description:
      "Scrape elements from a rendered page using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "Scrape"],
    icon: "search",
    documentation:
      "Scrapes structured data from web pages using CSS selectors. Either url or html is required (not both). Elements parameter is required. See [Cloudflare Browser Rendering Scrape Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/scrape-endpoint/) for details.",
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
        name: "elements",
        type: "json",
        description: "Array of CSS selectors to scrape (required)",
        required: true,
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
        description: "Selector to wait for before scraping",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description:
          "Array of scraped results as returned by Cloudflare [{ result, selector }]",
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
    const { url, html, elements, gotoOptions, waitForSelector } =
      context.inputs;

    if (!elements) {
      return this.createErrorResult("'elements' is required.");
    }

    // Parse elements if it's a string (from JSON input)
    let parsedElements = elements;
    if (typeof elements === "string") {
      try {
        const cleanedElements = elements
          .replace(/\n/g, " ")
          .replace(/\t/g, " ")
          .replace(/\s+/g, " ");
        parsedElements = JSON.parse(cleanedElements);
      } catch (error) {
        return this.createErrorResult(
          `Invalid JSON for 'elements': ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const body: Record<string, unknown> = { elements: parsedElements };
    if (url) body.url = url;
    if (html) body.html = html;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const result = await fetchBrowserRenderingJson(
      context,
      "scrape",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    if (!Array.isArray(result.json.result)) {
      return this.createErrorResult(
        "Cloudflare API error: No results array returned"
      );
    }

    return this.createSuccessResult(
      { results: result.json.result, status: result.status },
      result.usage
    );
  }
}
