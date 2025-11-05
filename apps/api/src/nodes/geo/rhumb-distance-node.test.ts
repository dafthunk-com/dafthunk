import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { RhumbDistanceNode } from "./rhumb-distance-node";

describe("RhumbDistanceNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    mode: "dev" as const,
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new RhumbDistanceNode({
    id: "test-node",
    name: "Test Node",
    type: "rhumbDistance",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should calculate distance between two points", async () => {
      const context = createMockContext({
        from: {
          type: "Point",
          coordinates: [0, 0],
        },
        to: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
      expect(result.outputs?.distance).toBeGreaterThan(0);
    });

    it("should work with identical points", async () => {
      const samePoint = {
        type: "Point",
        coordinates: [0, 0],
      };

      const context = createMockContext({
        from: samePoint,
        to: samePoint,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with different units", async () => {
      const context = createMockContext({
        from: {
          type: "Point",
          coordinates: [0, 0],
        },
        to: {
          type: "Point",
          coordinates: [1, 1],
        },
        units: "miles",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with Point Features", async () => {
      const context = createMockContext({
        from: {
          type: "Feature",
          properties: { name: "Start Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        to: {
          type: "Feature",
          properties: { name: "End Point" },
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });
  });

  describe("Error handling", () => {
    it("should handle missing from point input", async () => {
      const context = createMockContext({
        to: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing from point input");
    });

    it("should handle missing to point input", async () => {
      const context = createMockContext({
        from: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing to point input");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        from: null,
        to: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing from point input");
    });
  });
});
