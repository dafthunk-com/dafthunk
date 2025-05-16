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
    name: "Cloudflare Browser Screenshot",
    type: "cloudflare-browser-screenshot",
    description:
      "Capture a screenshot of a webpage using Cloudflare Browser Rendering.",
    category: "Net",
    icon: "camera",
    inputs: [
      {
        name: "url",
        type: "string",
        description:
          "The URL of the webpage to screenshot (optional if html is provided)",
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
        name: "addScriptTag",
        type: "json",
        description: "Array of script tags to inject (optional)",
        hidden: true,
      },
      {
        name: "addStyleTag",
        type: "json",
        description: "Array of style tags to inject (optional)",
        hidden: true,
      },
      {
        name: "cookies",
        type: "json",
        description: "Cookies to set (optional)",
        hidden: true,
      },
      {
        name: "authenticate",
        type: "json",
        description: "HTTP authentication credentials (optional)",
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

    // Require at least one of url or html
    if (!url && !html) {
      return this.createErrorResult(
        "You must provide either a 'url' or 'html' input."
      );
    }

    // Build request body
    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    body.screenshotOptions = screenshotOptions ?? {
      fullPage: true,
      omitBackground: false,
    };
    body.viewport = viewport ?? { width: 1280, height: 720 };
    body.gotoOptions = gotoOptions ?? {
      waitUntil: "networkidle0",
      timeout: 45000,
    };
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
