import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

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
    if (screenshotOptions) body.screenshotOptions = screenshotOptions;
    if (viewport) body.viewport = viewport;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (addScriptTag) body.addScriptTag = addScriptTag;
    if (addStyleTag) body.addStyleTag = addStyleTag;
    if (cookies) body.cookies = cookies;
    if (authenticate) body.authenticate = authenticate;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return this.createErrorResult(
          `Cloudflare API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // The response is a PNG image (binary)
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);
      if (!imageBuffer || imageBuffer.length === 0) {
        return this.createErrorResult(
          "Cloudflare API error: No valid screenshot data returned"
        );
      }
      return this.createSuccessResult({
        image: {
          data: imageBuffer,
          mimeType: "image/png",
        },
        status: response.status,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
