import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Cloudflare Browser Rendering PDF Node (REST API version)
 * Calls the Cloudflare Browser Rendering REST API /pdf endpoint to fetch a PDF from a rendered page.
 * See: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/pdf/
 */
export class CloudflareBrowserPdfNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-pdf",
    name: "Browser PDF",
    type: "cloudflare-browser-pdf",
    description:
      "Fetch a PDF from a rendered page using Cloudflare Browser Rendering.",
    tags: ["Browser", "Web", "Cloudflare", "PDF"],
    icon: "file-text",
    documentation:
      "Generates PDF documents from web pages. Either url or html is required (not both). See [Cloudflare Browser Rendering PDF Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/pdf-endpoint/) for details.",
    computeCost: 10,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The URL to render (either url or html required, not both)",
      },
      {
        name: "html",
        type: "string",
        description:
          "HTML content to render (either url or html required, not both)",
      },
      {
        name: "pdfOptions",
        type: "json",
        description: "PDF generation options (format, margins, headers, etc.)",
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
        name: "gotoOptions",
        type: "json",
        description: "Page navigation options",
        hidden: true,
      },
      {
        name: "waitForSelector",
        type: "json",
        description: "Selector to wait for before generation",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "pdf",
        type: "document",
        description: "The captured PDF as a document (application/pdf)",
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
      pdfOptions,
      rejectResourceTypes,
      rejectRequestPattern,
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
    if (pdfOptions) body.pdfOptions = pdfOptions;
    if (rejectResourceTypes) body.rejectResourceTypes = rejectResourceTypes;
    if (rejectRequestPattern) body.rejectRequestPattern = rejectRequestPattern;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/pdf`;

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
      if (!response.ok) {
        const errorText = await response.text();
        return this.createErrorResult(
          `Cloudflare API error: ${status} - ${errorText}`
        );
      }

      // The response is a PDF file (binary)
      const arrayBuffer = await response.arrayBuffer();
      const pdfBuffer = new Uint8Array(arrayBuffer);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        return this.createErrorResult(
          "Cloudflare API error: No valid PDF data returned"
        );
      }
      return this.createSuccessResult({
        pdf: {
          data: pdfBuffer,
          mimeType: "application/pdf",
        },
        status,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
