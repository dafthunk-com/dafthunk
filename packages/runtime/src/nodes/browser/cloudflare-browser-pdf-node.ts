import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  fetchBrowserRenderingBinary,
  validateBrowserInputs,
} from "./browser-rendering-api";

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
    const validationError = validateBrowserInputs(this, context);
    if (validationError) return validationError;

    const startTime = Date.now();
    const {
      url,
      html,
      pdfOptions,
      rejectResourceTypes,
      rejectRequestPattern,
      gotoOptions,
      waitForSelector,
    } = context.inputs;

    const body: Record<string, unknown> = {};
    if (url) body.url = url;
    if (html) body.html = html;
    if (pdfOptions) body.pdfOptions = pdfOptions;
    if (rejectResourceTypes) body.rejectResourceTypes = rejectResourceTypes;
    if (rejectRequestPattern) body.rejectRequestPattern = rejectRequestPattern;
    if (gotoOptions) body.gotoOptions = gotoOptions;
    if (waitForSelector) body.waitForSelector = waitForSelector;

    const result = await fetchBrowserRenderingBinary(
      context,
      "pdf",
      body,
      startTime
    );

    if ("error" in result) {
      return this.createErrorResult(result.error);
    }

    return this.createSuccessResult(
      {
        pdf: { data: result.data, mimeType: "application/pdf" },
        status: result.status,
      },
      result.usage
    );
  }
}
