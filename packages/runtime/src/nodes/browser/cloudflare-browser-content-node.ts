import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingJson,
  validateBrowserInputs,
} from "./browser-rendering-api";

/**
 * Cloudflare Browser Rendering Content Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /content endpoint to fetch fully rendered HTML.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/content/methods/create/
 */
export class CloudflareBrowserContentNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-content",
    name: "Browser Content",
    type: "cloudflare-browser-content",
    description:
      "Fetch fully rendered HTML from a URL using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "Content"],
    icon: "globe",
    documentation:
      "Fetches fully rendered HTML content from a web page. Either url or html is required (not both). See [Cloudflare Browser Rendering Content Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/content-endpoint/) for details.",
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
        name: "rejectResourceTypes",
        type: "json",
        description: "Array of resource types to block",
        hidden: true,
      },
      {
        name: "rejectRequestPattern",
        type: "json",
        description: "Array of regex patterns to block requests",
        hidden: true,
      },
      {
        name: "allowRequestPattern",
        type: "json",
        description: "Array of regex patterns to allow requests",
        hidden: true,
      },
      {
        name: "allowResourceTypes",
        type: "json",
        description: "Array of resource types to allow",
        hidden: true,
      },
      {
        name: "setExtraHTTPHeaders",
        type: "json",
        description: "Custom HTTP headers",
        hidden: true,
      },
      {
        name: "cookies",
        type: "json",
        description: "Cookies to set",
        hidden: true,
      },
      {
        name: "gotoOptions",
        type: "json",
        description: "Page navigation options",
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
    const validationError = validateBrowserInputs(this, context);
    if (validationError) return validationError;

    const startTime = Date.now();
    const {
      url,
      html,
      rejectResourceTypes,
      rejectRequestPattern,
      allowRequestPattern,
      allowResourceTypes,
      setExtraHTTPHeaders,
      cookies,
      gotoOptions,
    } = context.inputs;

    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (rejectResourceTypes) body.rejectResourceTypes = rejectResourceTypes;
    if (rejectRequestPattern) body.rejectRequestPattern = rejectRequestPattern;
    if (allowRequestPattern) body.allowRequestPattern = allowRequestPattern;
    if (allowResourceTypes) body.allowResourceTypes = allowResourceTypes;
    if (setExtraHTTPHeaders) body.setExtraHTTPHeaders = setExtraHTTPHeaders;
    if (cookies) body.cookies = cookies;
    if (gotoOptions) body.gotoOptions = gotoOptions;

    const result = await fetchBrowserRenderingJson(
      context,
      "content",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    if (typeof result.json.result !== "string") {
      return this.createErrorResult(
        "Cloudflare API error: No content returned"
      );
    }

    return this.createSuccessResult(
      { html: result.json.result, status: result.status },
      result.usage
    );
  }
}
