import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingJson,
  validateBrowserInputs,
} from "./browser-rendering-api";

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
    const validationError = validateBrowserInputs(this, context);
    if (validationError) return validationError;

    const startTime = Date.now();
    const {
      url,
      html,
      visibleLinksOnly,
      excludeExternalLinks,
      gotoOptions,
      waitForSelector,
    } = context.inputs;

    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (visibleLinksOnly !== undefined)
      body.visibleLinksOnly = visibleLinksOnly;
    if (excludeExternalLinks !== undefined)
      body.excludeExternalLinks = excludeExternalLinks;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const result = await fetchBrowserRenderingJson(
      context,
      "links",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    if (!Array.isArray(result.json.result)) {
      return this.createErrorResult(
        "Cloudflare API error: No links array returned"
      );
    }

    return this.createSuccessResult(
      { links: result.json.result, status: result.status },
      result.usage
    );
  }
}
