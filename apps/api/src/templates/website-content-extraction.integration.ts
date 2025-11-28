import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { ToMarkdownNode } from "../nodes/document/to-markdown-node";
import { FormDataStringNode } from "../nodes/http/form-data-string-node";

import { websiteContentExtractionTemplate } from "./website-content-extraction";

describe("Website Content Extraction Template", () => {
  it("should have correct node types defined", () => {
    expect(websiteContentExtractionTemplate.nodes).toHaveLength(3);
    expect(websiteContentExtractionTemplate.edges).toHaveLength(2);

    const nodeTypes = websiteContentExtractionTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("form-data-string");
    expect(nodeTypes).toContain("cloudflare-browser-content");
    expect(nodeTypes).toContain("to-markdown");
  });

  it("should execute form data and to-markdown nodes", async () => {
    // Execute form data string node
    const urlInputNode = websiteContentExtractionTemplate.nodes.find(
      (n) => n.id === "url-input-1"
    )!;
    const urlInputInstance = new FormDataStringNode(urlInputNode);
    const urlInputResult = await urlInputInstance.execute({
      nodeId: urlInputNode.id,
      inputs: { name: "url", required: true },
      env: env as Bindings,
      httpRequest: {
        formData: { url: "https://example.com" },
      },
    } as any);
    expect(urlInputResult.status).toBe("completed");
    expect(urlInputResult.outputs?.value).toBe("https://example.com");

    // Execute to-markdown node with sample HTML
    const toMarkdownNode = websiteContentExtractionTemplate.nodes.find(
      (n) => n.id === "to-markdown-1"
    )!;
    const toMarkdownInstance = new ToMarkdownNode(toMarkdownNode);
    const htmlContent = "<html><body><h1>Hello</h1><p>World</p></body></html>";
    const toMarkdownResult = await toMarkdownInstance.execute({
      nodeId: toMarkdownNode.id,
      inputs: {
        document: {
          data: new TextEncoder().encode(htmlContent),
          mimeType: "text/html",
        },
      },
      env: env as Bindings,
    } as any);
    expect(toMarkdownResult.status).toBe("completed");
    expect(toMarkdownResult.outputs?.markdown).toBeDefined();
    expect(typeof toMarkdownResult.outputs?.markdown).toBe("string");
    expect(toMarkdownResult.outputs?.markdown).toContain("Hello");
  });
});
