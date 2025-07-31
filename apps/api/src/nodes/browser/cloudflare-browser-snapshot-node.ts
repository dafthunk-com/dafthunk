import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Cloudflare Browser Rendering Snapshot Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /snapshot endpoint to get HTML content and screenshot.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/snapshot/
 */
export class CloudflareBrowserSnapshotNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-snapshot",
    name: "Browser Snapshot",
    type: "cloudflare-browser-snapshot",
    description:
      "Get HTML content and screenshot from a rendered page using Cloudflare Browser Rendering.",
    tags: ["Browser"],
    icon: "camera",
    computeCost: 10,
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
        name: "screenshotOptions",
        type: "json",
        description:
          "Screenshot options (e.g. fullPage, omitBackground, clip, etc.) (optional)",
      },
      {
        name: "viewport",
        type: "json",
        description:
          "Viewport settings (width, height, deviceScaleFactor, etc.) (optional)",
        hidden: true,
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
        description: "Wait for selector before capturing (optional)",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "content",
        type: "string",
        description: "The rendered HTML content",
      },
      {
        name: "screenshot",
        type: "image",
        description: "The captured screenshot as an image (PNG)",
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
      screenshotOptions,
      viewport,
      gotoOptions,
      waitForSelector,
    } = context.inputs;

    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;

    if (!url || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return this.createErrorResult(
        "'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required."
      );
    }

    // Build request body
    const body: Record<string, unknown> = { url };
    if (html) body.html = html;
    if (screenshotOptions) body.screenshotOptions = screenshotOptions;
    if (viewport) body.viewport = viewport;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/snapshot`;

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

      // The response should have both content and screenshot in result
      if (
        !json.result ||
        typeof json.result.content !== "string" ||
        !json.result.screenshot
      ) {
        return this.createErrorResult(
          "Cloudflare API error: Invalid snapshot response format"
        );
      }

      // Convert base64 screenshot to buffer
      const screenshotData = Buffer.from(json.result.screenshot, "base64");
      if (!screenshotData || screenshotData.length === 0) {
        return this.createErrorResult(
          "Cloudflare API error: Invalid screenshot data"
        );
      }

      return this.createSuccessResult({
        status,
        content: json.result.content,
        screenshot: {
          data: new Uint8Array(screenshotData),
          mimeType: "image/png",
        },
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
