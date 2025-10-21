import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BufferNode } from "./buffer-node";

describe("BufferNode", () => {
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

  const node = new BufferNode({
    id: "test-node",
    name: "Test Node",
    type: "buffer",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should buffer a point with radius", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: 10,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.buffered).toBeDefined();
    });

    it("should buffer with custom units", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: 1,
        units: "miles",
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.buffered).toBeDefined();
    });

    it("should buffer with custom steps", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: 1,
        steps: 16,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.buffered).toBeDefined();
    });

    it("should handle negative radius", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: -1,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.buffered).toBeDefined();
    });
  });

  describe("Input validation", () => {
    it("should error on missing geojson", async () => {
      const context = createMockContext({ radius: 1 });
      const result = await node.execute(context);
      expect(result.status).toBe("error");
      expect(result.error).toMatch(/Missing geojson input/);
    });

    it("should error on missing radius", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
      });
      const result = await node.execute(context);
      expect(result.status).toBe("error");
      expect(result.error).toMatch(/Missing radius input/);
    });

    it("should handle null radius", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: null,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("error");
      expect(result.error).toMatch(/Missing radius input/);
    });
  });

  describe("Options handling", () => {
    it("should pass undefined units when not provided", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: 1,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
    });

    it("should pass undefined steps when not provided", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: 1,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
    });

    it("should pass both units and steps when provided", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        radius: 1,
        units: "kilometers",
        steps: 8,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
    });
  });
});
