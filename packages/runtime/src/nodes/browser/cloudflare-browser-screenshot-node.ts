import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingBinary,
  validateBrowserInputs,
} from "./browser-rendering-api";

/**
 * Cloudflare Browser Rendering Screenshot Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /screenshot endpoint to capture a screenshot of a page.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/screenshot/
 */
export class CloudflareBrowserScreenshotNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-screenshot",
    name: "Browser Screenshot",
    type: "cloudflare-browser-screenshot",
    description:
      "Capture a screenshot of a webpage using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "Screenshot"],
    icon: "camera",
    documentation:
      "Captures screenshots of web pages. Either url or html is required (not both). See [Cloudflare Browser Rendering Screenshot Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/screenshot-endpoint/) for details.",
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
          "Screenshot options (fullPage, omitBackground, selector, type, etc.)",
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
        name: "addScriptTag",
        type: "json",
        description: "Script tags to inject",
        hidden: true,
      },
      {
        name: "addStyleTag",
        type: "json",
        description: "Style tags to inject",
        hidden: true,
      },
      {
        name: "cookies",
        type: "json",
        description: "Cookies to set",
        hidden: true,
      },
      {
        name: "authenticate",
        type: "json",
        description: "HTTP authentication credentials",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
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
      addScriptTag,
      addStyleTag,
      cookies,
      authenticate,
    } = context.inputs;

    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (screenshotOptions) body.screenshotOptions = screenshotOptions;
    if (viewport) body.viewport = viewport;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (addScriptTag) body.addScriptTag = addScriptTag;
    if (addStyleTag) body.addStyleTag = addStyleTag;
    if (cookies) body.cookies = cookies;
    if (authenticate) body.authenticate = authenticate;

    const result = await fetchBrowserRenderingBinary(
      context,
      "screenshot",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    return this.createSuccessResult(
      {
        image: { data: result.data, mimeType: "image/png" },
        status: result.status,
      },
      result.usage
    );
  }
}
