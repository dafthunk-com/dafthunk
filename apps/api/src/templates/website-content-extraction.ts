import type { WorkflowTemplate } from "@dafthunk/types";

import { CloudflareBrowserContentNode } from "../nodes/browser/cloudflare-browser-content-node";
import { ToMarkdownNode } from "../nodes/document/to-markdown-node";
import { FormDataStringNode } from "../nodes/http/form-data-string-node";

export const websiteContentExtractionTemplate: WorkflowTemplate = {
  id: "website-content-extraction",
  name: "Website Content Extraction",
  description: "Extract and convert website content to markdown",
  category: "web-scraping",
  type: "http_request",
  tags: ["web", "scraping", "markdown", "content"],
  nodes: [
    FormDataStringNode.create({
      id: "url-input-1",
      position: { x: 100, y: 100 },
      description: "Enter website URL to scrape",
      inputs: { name: "url", required: true },
    }),
    CloudflareBrowserContentNode.create({
      id: "browser-content-1",
      position: { x: 500, y: 100 },
      description: "Extract website content",
    }),
    ToMarkdownNode.create({
      id: "to-markdown-1",
      position: { x: 900, y: 100 },
      description: "Convert content to markdown format",
    }),
  ],
  edges: [
    {
      source: "url-input-1",
      target: "browser-content-1",
      sourceOutput: "value",
      targetInput: "url",
    },
    {
      source: "browser-content-1",
      target: "to-markdown-1",
      sourceOutput: "html",
      targetInput: "document",
    },
  ],
};
