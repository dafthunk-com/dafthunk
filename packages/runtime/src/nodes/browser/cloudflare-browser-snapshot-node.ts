import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingJson,
  validateBrowserInputs,
} from "./browser-rendering-api";

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
    tags: ["Browser", "Web", "Cloudflare", "Snapshot"],
    icon: "camera",
    documentation:
      "Captures HTML content and screenshots from web pages. Either url or html is required (not both). See [Cloudflare Browser Rendering API](https://developers.cloudflare.com/browser-rendering/) for details.",
    usage: 10,
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
        name: "screenshotOptions",
        type: "json",
        description:
          "Screenshot options (fullPage, omitBackground, clip, etc.)",
      },
      {
        name: "viewport",
        type: "json",
        description: "Viewport settings (width, height, deviceScaleFactor)",
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
        description: "Selector to wait for before capturing",
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
    const validationError = validateBrowserInputs(this, context);
    if (validationError) return validationError;

    const startTime = Date.now();
    const {
      url,
      html,
      screenshotOptions,
      viewport,
      gotoOptions,
      waitForSelector,
    } = context.inputs;

    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (screenshotOptions) body.screenshotOptions = screenshotOptions;
    if (viewport) body.viewport = viewport;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const result = await fetchBrowserRenderingJson(
      context,
      "snapshot",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    const { json } = result;
    if (
      !json.result ||
      typeof json.result.content !== "string" ||
      !json.result.screenshot
    ) {
      return this.createErrorResult(
        "Cloudflare API error: Invalid snapshot response format"
      );
    }

    const screenshotData = Buffer.from(json.result.screenshot, "base64");
    if (!screenshotData || screenshotData.length === 0) {
      return this.createErrorResult(
        "Cloudflare API error: Invalid screenshot data"
      );
    }

    return this.createSuccessResult(
      {
        content: json.result.content,
        screenshot: {
          data: new Uint8Array(screenshotData),
          mimeType: "image/png",
        },
        status: result.status,
      },
      result.usage
    );
  }
}
