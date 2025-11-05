import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { LineOffsetNode } from "./line-offset-node";

describe("LineOffsetNode", () => {
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

  const node = new LineOffsetNode({
    id: "test-node",
    name: "Test Node",
    type: "line-offset",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return offset line when given valid line and distance", async () => {
      const context = createMockContext({
        line: {
          type: "Feature",
          properties: { name: "Test Line" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("Feature");
      expect(result.outputs?.offset.geometry.type).toBe("LineString");
    });

    it("should work with simple LineString geometry", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 2],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with positive distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with negative distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: -3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with zero distance", async () => {
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
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
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
        distance: 1,
        units: "kilometers",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with various unit strings", async () => {
      const units = ["kilometers", "miles", "meters", "feet", "inches"];

      for (const unit of units) {
        const context = createMockContext({
          line: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
          distance: 1,
          units: unit,
        });

        const result = await node.execute(context);

        expect(result.status).toBe("completed");
        expect(result.outputs?.offset).toBeDefined();
        expect(result.outputs?.offset.type).toBe("LineString");
      }
    });

    it("should work with horizontal line", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, 0],
          ],
        },
        distance: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with vertical line", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 5],
          ],
        },
        distance: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with multi-segment line", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 0],
            [3, 1],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with decimal coordinates", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0.5, 0.5],
            [1.5, 1.5],
          ],
        },
        distance: 0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with negative coordinates", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [-1, -1],
            [1, 1],
          ],
        },
        distance: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with very small distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 0.000001,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with very large distance", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1000000,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should work with MultiLineString geometry", async () => {
      const context = createMockContext({
        line: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
            [
              [2, 2],
              [3, 3],
            ],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("MultiLineString");
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

    it("should handle null line input", async () => {
      const context = createMockContext({
        line: null,
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing line input");
    });

    it("should handle undefined line input", async () => {
      const context = createMockContext({
        line: undefined,
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

    it("should handle undefined distance input", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing distance input");
    });

    it("should handle invalid distance type", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Distance must be a number");
    });

    it("should handle distance as boolean", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Distance must be a number");
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

    it("should handle units as boolean", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1,
        units: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Units must be a string");
    });
  });

  describe("Edge cases", () => {
    it("should handle null units option", async () => {
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
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle undefined units option", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        distance: 1,
        units: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle single point line (degenerate case)", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 0],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle very short line", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0.000001, 0.000001],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle very long line", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1000000, 1000000],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle line with many segments", async () => {
      const coordinates = [];
      for (let i = 0; i < 100; i++) {
        coordinates.push([i, i]);
      }

      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates,
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle line with very large coordinates", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [1000000, 1000000],
            [2000000, 2000000],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });

    it("should handle line with very small coordinates", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [0.000001, 0.000001],
            [0.000002, 0.000002],
          ],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.offset).toBeDefined();
      expect(result.outputs?.offset.type).toBe("LineString");
    });
  });
});
