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
    name: "Browser Links",
    type: "cloudflare-browser-links",
    description:
      "Fetch all links from a rendered page using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "Links"],
    icon: "link",
    documentation:
      "Extracts all links from a web page. Either url or html is required (not both). See [Cloudflare Browser Rendering Links Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/links-endpoint/) for details.",
    computeCost: 10,
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
        name: "visibleLinksOnly",
        type: "boolean",
        description: "Only return visible links",
        hidden: true,
      },
      {
        name: "excludeExternalLinks",
        type: "boolean",
        description: "Exclude links to external domains",
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
    const {
      url,
      html,
      visibleLinksOnly,
      excludeExternalLinks,
      gotoOptions,
      waitForSelector,
    } = context.inputs;

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
    if (visibleLinksOnly !== undefined)
      body.visibleLinksOnly = visibleLinksOnly;
    if (excludeExternalLinks !== undefined)
      body.excludeExternalLinks = excludeExternalLinks;
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
