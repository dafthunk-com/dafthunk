import { ExecutableNode, NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";
import Cloudflare from "cloudflare";

/**
 * Cloudflare Browser Rendering Content Node
 * Calls the Cloudflare Browser Rendering REST API /content endpoint to fetch fully rendered HTML.
 * See: https://developers.cloudflare.com/browser-rendering/rest-api/content-endpoint/
 */
export class CloudflareBrowserContentNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-content",
    name: "Cloudflare Browser Content",
    type: "cloudflare-browser-content",
    description: "Fetch fully rendered HTML from a URL using Cloudflare Browser Rendering.",
    category: "Net",
    icon: "globe",
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
      return this.createErrorResult("'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required.");
    }

    try {
      const client = new Cloudflare({
        apiToken: CLOUDFLARE_API_TOKEN,
      });
      const params: Record<string, unknown> = { url };
      if (rejectResourceTypes) params.rejectResourceTypes = rejectResourceTypes;
      if (rejectRequestPattern) params.rejectRequestPattern = rejectRequestPattern;
      if (allowRequestPattern) params.allowRequestPattern = allowRequestPattern;
      if (allowResourceTypes) params.allowResourceTypes = allowResourceTypes;
      if (setExtraHTTPHeaders) params.setExtraHTTPHeaders = setExtraHTTPHeaders;
      if (cookies) params.cookies = cookies;
      if (gotoOptions) params.gotoOptions = gotoOptions;

      // Call the Cloudflare SDK
      const sdkResult = await client.browserRendering.content.create({
        account_id: CLOUDFLARE_ACCOUNT_ID,
        ...params,
      });
      // Type guard for SDK result
      let result: any = sdkResult;
      console.log("Cloudflare SDK raw result:", result);
      // If result is a string, treat as HTML
      if (typeof result === "string") {
        return this.createSuccessResult({
          status: 200,
          html: result,
        });
      }
      // Try to find HTML content in common places
      const html = result?.result?.content || result?.content || result?.html || null;
      if (!html || typeof html !== "string") {
        return this.createErrorResult(
          result?.errors?.[0]?.message || "Cloudflare SDK error: No content returned"
        );
      }
      return this.createSuccessResult({
        status: 200, // SDK does not expose HTTP status, assume 200 if no error
        html,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
} 