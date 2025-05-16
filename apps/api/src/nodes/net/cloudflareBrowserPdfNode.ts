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
    name: "Cloudflare Browser PDF",
    type: "cloudflare-browser-pdf",
    description:
      "Fetch a PDF from a rendered page using Cloudflare Browser Rendering.",
    category: "Net",
    icon: "file-text",
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
        name: "pdfOptions",
        type: "json",
        description:
          "PDF options (e.g. format, printBackground, etc.) (optional)",
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
        description: "Wait for selector before extracting (optional)",
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
    const { url, html, pdfOptions, gotoOptions, waitForSelector } =
      context.inputs;

    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;

    if (!url || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return this.createErrorResult(
        "'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required."
      );
    }

    // Build request body
    const body: Record<string, unknown> = { url };
    if (html) body.html = html;
    if (pdfOptions) body.pdfOptions = pdfOptions;
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
