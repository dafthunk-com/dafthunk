import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

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
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The URL to render (either url or html required, not both)",
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
        description:
          "Array of CSS selectors to scrape (required)",
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
    const { url, html, elements, gotoOptions, waitForSelector } =
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

    if (!elements) {
      return this.createErrorResult("'elements' is required.");
    }

    // Parse elements if it's a string (from JSON input)
    let parsedElements = elements;
    if (typeof elements === "string") {
      try {
        // Remove any literal newlines/tabs that may have been introduced during copy-paste
        const cleanedElements = elements.replace(/\n/g, " ").replace(/\t/g, " ").replace(/\s+/g, " ");
        parsedElements = JSON.parse(cleanedElements);
      } catch (error) {
        return this.createErrorResult(
          `Invalid JSON for 'elements': ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Build request body
    const body: Record<string, unknown> = { elements: parsedElements };
    if (url) body.url = url;
    if (html) body.html = html;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/scrape`;

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

      // The results are in json.result (should be an array of { result, selector })
      if (!Array.isArray(json.result)) {
        return this.createErrorResult(
          "Cloudflare API error: No results array returned"
        );
      }
      return this.createSuccessResult({
        status,
        results: json.result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
