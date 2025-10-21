import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { SquareNode } from "./square-node";

describe("SquareNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new SquareNode({
    id: "test-node",
    name: "Test Node",
    type: "square",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return a square bbox when given valid bbox", async () => {
      const context = createMockContext({
        bbox: [0, 0, 10, 10],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        bbox: [1, 2, 5, 8],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should work with negative coordinates", async () => {
      const context = createMockContext({
        bbox: [-10, -5, -1, 3],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should work with mixed positive and negative coordinates", async () => {
      const context = createMockContext({
        bbox: [-5, -3, 2, 7],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should work with zero coordinates", async () => {
      const context = createMockContext({
        bbox: [0, 0, 0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should work with large coordinates", async () => {
      const context = createMockContext({
        bbox: [1000, 2000, 5000, 8000],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });
  });

  describe("Input validation", () => {
    it("should handle missing bbox input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle null bbox input", async () => {
      const context = createMockContext({
        bbox: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle undefined bbox input", async () => {
      const context = createMockContext({
        bbox: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle non-array bbox input", async () => {
      const context = createMockContext({
        bbox: "not an array",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox must be an array");
    });

    it("should handle bbox with wrong number of elements", async () => {
      const context = createMockContext({
        bbox: [1, 2, 3],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must have exactly 4 elements [west, south, east, north]"
      );
    });

    it("should handle bbox with too many elements", async () => {
      const context = createMockContext({
        bbox: [1, 2, 3, 4, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must have exactly 4 elements [west, south, east, north]"
      );
    });

    it("should handle bbox with non-number elements", async () => {
      const context = createMockContext({
        bbox: [1, "2", 3, 4],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 1 must be a number");
    });

    it("should handle bbox with null elements", async () => {
      const context = createMockContext({
        bbox: [1, null, 3, 4],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 1 must be a number");
    });

    it("should handle bbox with undefined elements", async () => {
      const context = createMockContext({
        bbox: [1, undefined, 3, 4],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 1 must be a number");
    });

    it("should handle bbox with boolean elements", async () => {
      const context = createMockContext({
        bbox: [1, true, 3, 4],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 1 must be a number");
    });

    it("should handle bbox with object elements", async () => {
      const context = createMockContext({
        bbox: [1, { x: 2 }, 3, 4],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 1 must be a number");
    });
  });

  describe("Edge cases", () => {
    it("should handle bbox with decimal coordinates", async () => {
      const context = createMockContext({
        bbox: [1.5, 2.7, 5.3, 8.9],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should handle bbox with very small coordinates", async () => {
      const context = createMockContext({
        bbox: [0.001, 0.002, 0.005, 0.008],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should handle bbox with very large coordinates", async () => {
      const context = createMockContext({
        bbox: [1000000, 2000000, 5000000, 8000000],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should handle bbox with equal coordinates", async () => {
      const context = createMockContext({
        bbox: [5, 5, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });

    it("should handle bbox with inverted coordinates", async () => {
      const context = createMockContext({
        bbox: [10, 10, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.square).toBeDefined();
      expect(Array.isArray(result.outputs?.square)).toBe(true);
      expect(result.outputs?.square.length).toBe(4);
    });
  });
});
