import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { AlongNode } from "./along-node";

describe("AlongNode", () => {
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

  const node = new AlongNode({
    id: "test-node",
    name: "Test Node",
    type: "along",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return a point when given valid inputs", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should work with LineString Feature", async () => {
      const context = createMockContext({
        line: {
          type: "Feature",
          properties: { name: "Test Line" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
              [2, 2],
            ],
          },
        },
        distance: 1.0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should work with units parameter", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 0.1,
        units: "miles",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
    });
  });

  describe("Input validation", () => {
    it("should handle missing line input", async () => {
      const context = createMockContext({
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing line input");
    });

    it("should handle missing distance input", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing distance input");
    });

    it("should handle null distance input", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing distance input");
    });

    it("should handle invalid distance (string)", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: "invalid",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Distance must be a valid number");
    });

    it("should handle invalid distance (NaN)", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: NaN,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Distance must be a valid number");
    });

    it("should handle invalid distance (Infinity)", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: Infinity,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Distance must be a valid number");
    });

    it("should handle invalid units type", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1,
        units: 123,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Units must be a string");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
    });

    it("should handle negative distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: -1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
    });

    it("should handle large distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1000,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
    });

    it("should handle null units", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1,
        units: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
    });
  });
});
