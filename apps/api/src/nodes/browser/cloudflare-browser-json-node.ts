import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Cloudflare Browser Rendering JSON Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /json endpoint to fetch JSON from a rendered page.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/json/methods/create/
 */
export class CloudflareBrowserJsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-json",
    name: "Browser JSON",
    type: "cloudflare-browser-json",
    description:
      "Fetch JSON from a rendered page using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "JSON"],
    icon: "braces",
    documentation:
      "Fetches JSON from a rendered page using Cloudflare Browser Rendering. Either url or html is required (not both). Either prompt or response_format is required. See [Cloudflare Browser Rendering JSON Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/json-endpoint/) for details.",
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
        name: "prompt",
        type: "string",
        description:
          "Natural language prompt for extracting JSON (either prompt or response_format required)",
      },
      {
        name: "response_format",
        type: "json",
        description:
          "JSON schema defining expected output structure (either prompt or response_format required)",
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
        name: "json",
        type: "json",
        description: "Extracted JSON as returned by Cloudflare",
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
    const { url, html, prompt, response_format, gotoOptions, waitForSelector } =
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

    if (!prompt && !response_format) {
      return this.createErrorResult(
        "Either 'prompt' or 'response_format' is required."
      );
    }

    // Build request body
    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (prompt) body.prompt = prompt;
    if (response_format) body.response_format = response_format;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/json`;

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

      // The extracted JSON is in json.result (should be an object)
      if (!json.result || typeof json.result !== "object") {
        return this.createErrorResult(
          "Cloudflare API error: No JSON result returned"
        );
      }
      return this.createSuccessResult({
        status,
        json: json.result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
