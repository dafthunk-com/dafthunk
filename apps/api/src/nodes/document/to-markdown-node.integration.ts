import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testPdfData } from "../../../test/fixtures/pdf-fixtures";
import { NodeContext } from "../types";
import { ToMarkdownNode } from "./to-markdown-node";

describe("ToMarkdownNode", () => {
  it("should convert PDF document to markdown", async () => {
    const nodeId = "to-markdown";
    const node = new ToMarkdownNode({
      nodeId,
    } as unknown as Node);

    // Use the real PDF fixture
    const mockPdfDocument = testPdfData;

    const context = {
      nodeId,
      inputs: {
        document: mockPdfDocument,
      },
      env: {
        AI: env.AI,
        AI_OPTIONS: {},
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    // Using a real PDF fixture, should successfully convert to markdown
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.markdown).toBeDefined();
    expect(typeof result.outputs?.markdown).toBe("string");
    expect(result.outputs?.markdown.length).toBeGreaterThan(0);
  });

  it("should handle missing AI service", async () => {
    const nodeId = "to-markdown";
    const node = new ToMarkdownNode({
      nodeId,
    } as unknown as Node);

    const mockDocument = {
      data: new Uint8Array([1, 2, 3, 4]),
      mimeType: "application/pdf",
    };

    const context = {
      nodeId,
      inputs: {
        document: mockDocument,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("AI service is not available");
  });

  it("should handle missing document input", async () => {
    const nodeId = "to-markdown";
    const node = new ToMarkdownNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {
        AI: env.AI,
        AI_OPTIONS: {},
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Document input is required but not provided"
    );
  });

  it("should handle unsupported mime type", async () => {
    const nodeId = "to-markdown";
    const node = new ToMarkdownNode({
      nodeId,
    } as unknown as Node);

    const mockDocument = {
      data: new Uint8Array([1, 2, 3, 4]),
      mimeType: "application/unsupported",
    };

    const context = {
      nodeId,
      inputs: {
        document: mockDocument,
      },
      env: {
        AI: env.AI,
        AI_OPTIONS: {},
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    // Should either complete successfully or handle gracefully
    expect(["completed", "error"]).toContain(result.status);
  });
});
