import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { BooleanContainsNode } from "./boolean-contains-node";

describe("BooleanContainsNode", () => {
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

  const node = new BooleanContainsNode({
    id: "test-node",
    name: "Test Node",
    type: "booleanContains",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return true when polygon contains point", async () => {
      const polygon = {
        type: "Polygon",
        coordinates: [
          [
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849],
            [-122.4194, 37.7849],
            [-122.4194, 37.7749],
          ],
        ],
      };

      const pointInside = {
        type: "Point",
        coordinates: [-122.4144, 37.7799],
      };

      const context = createMockContext({
        feature1: polygon,
        feature2: pointInside,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
    });

    it("should return true when point is on polygon boundary", async () => {
      const polygon = {
        type: "Polygon",
        coordinates: [
          [
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849],
            [-122.4194, 37.7849],
            [-122.4194, 37.7749],
          ],
        ],
      };

      const pointOnBoundary = {
        type: "Point",
        coordinates: [-122.4144, 37.7749], // On the polygon edge
      };

      const context = createMockContext({
        feature1: polygon,
        feature2: pointOnBoundary,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true); // Boundary points are contained according to Turf.js
    });
  });

  describe("Input validation", () => {
    it("should handle missing feature1 input", async () => {
      const context = createMockContext({
        feature2: {
          type: "Point",
          coordinates: [-122.4144, 37.7799],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature1 input");
    });

    it("should handle missing feature2 input", async () => {
      const context = createMockContext({
        feature1: {
          type: "Polygon",
          coordinates: [
            [
              [-122.4194, 37.7749],
              [-122.4094, 37.7749],
              [-122.4094, 37.7849],
              [-122.4194, 37.7849],
              [-122.4194, 37.7749],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature2 input");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        feature1: null,
        feature2: {
          type: "Point",
          coordinates: [-122.4144, 37.7799],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature1 input");
    });
  });
});
