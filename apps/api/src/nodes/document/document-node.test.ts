import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { DocumentNode } from "./document-node";

describe("DocumentNode", () => {
  it("should pass through document data", async () => {
    const nodeId = "document";
    const node = new DocumentNode({
      nodeId,
    } as unknown as Node);

    const mockDocument = {
      data: new Uint8Array([1, 2, 3, 4]),
      mimeType: "application/pdf",
    };

    const context = {
      nodeId,
      inputs: {
        value: mockDocument,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.document).toBeDefined();
    expect(result.outputs?.document).toEqual(mockDocument);
  });

  it("should handle missing document data", async () => {
    const nodeId = "document";
    const node = new DocumentNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No document data provided");
  });

  it("should handle null document data", async () => {
    const nodeId = "document";
    const node = new DocumentNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: null,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No document data provided");
  });

  it("should handle undefined document data", async () => {
    const nodeId = "document";
    const node = new DocumentNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: undefined,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No document data provided");
  });

  it("should handle different document types", async () => {
    const nodeId = "document";
    const node = new DocumentNode({
      nodeId,
    } as unknown as Node);

    const testCases = [
      {
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "application/pdf",
      },
      {
        data: new Uint8Array([255, 216, 255, 224]),
        mimeType: "image/jpeg",
      },
      {
        data: new Uint8Array([137, 80, 78, 71]),
        mimeType: "image/png",
      },
    ];

    for (const testCase of testCases) {
      const context = {
        nodeId,
        inputs: {
          value: testCase,
        },
        env: {},
      } as unknown as NodeContext;

      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.document).toEqual(testCase);
    }
  });
});
