import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { PolygonSmoothNode } from "./polygon-smooth-node";

describe("PolygonSmoothNode", () => {
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

  const node = new PolygonSmoothNode({
    id: "test-node",
    name: "Test Node",
    type: "polygon-smooth",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return smoothed polygon when given valid polygon", async () => {
      const context = createMockContext({
        polygon: {
          type: "Feature",
          properties: { name: "Test Polygon" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0],
              ],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Feature");
      expect(result.outputs?.smoothed.geometry.type).toBe("Polygon");
    });

    it("should work with simple polygon geometry", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [3, 0],
              [3, 3],
              [0, 3],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with iterations parameter", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with highQuality parameter set to true", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        highQuality: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with highQuality parameter set to false", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        highQuality: false,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with both iterations and highQuality parameters", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: 3,
        highQuality: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with iterations set to 0", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with iterations set to 10", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with polygon with hole", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with MultiPolygon geometry", async () => {
      const context = createMockContext({
        polygon: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0],
              ],
            ],
            [
              [
                [4, 4],
                [6, 4],
                [6, 6],
                [4, 6],
                [4, 4],
              ],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("MultiPolygon");
    });

    it("should work with triangle polygon", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [1, 2],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with irregular polygon", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [2, 1],
              [1, 2],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with decimal coordinates", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0.5, 0.5],
              [2.5, 0.5],
              [2.5, 2.5],
              [0.5, 2.5],
              [0.5, 0.5],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with negative coordinates", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [-2, -2],
              [2, -2],
              [2, 2],
              [-2, 2],
              [-2, -2],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with very large coordinates", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1000000, 1000000],
              [2000000, 1000000],
              [2000000, 2000000],
              [1000000, 2000000],
              [1000000, 1000000],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should work with very small coordinates", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0.000001, 0.000001],
              [0.000002, 0.000001],
              [0.000002, 0.000002],
              [0.000001, 0.000002],
              [0.000001, 0.000001],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });
  });

  describe("Input validation", () => {
    it("should handle missing polygon input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });

    it("should handle null polygon input", async () => {
      const context = createMockContext({
        polygon: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });

    it("should handle undefined polygon input", async () => {
      const context = createMockContext({
        polygon: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });

    it("should handle invalid iterations type", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Iterations must be a number");
    });

    it("should handle iterations as boolean", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Iterations must be a number");
    });

    it("should handle negative iterations", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: -1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Iterations must be a non-negative number");
    });

    it("should handle invalid highQuality type", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        highQuality: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("HighQuality must be a boolean");
    });

    it("should handle highQuality as number", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        highQuality: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("HighQuality must be a boolean");
    });
  });

  describe("Edge cases", () => {
    it("should handle null iterations option", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle undefined iterations option", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        iterations: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle null highQuality option", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        highQuality: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle undefined highQuality option", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        highQuality: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle polygon with many vertices", async () => {
      const coordinates = [];
      for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * 2 * Math.PI;
        coordinates.push([Math.cos(angle), Math.sin(angle)]);
      }
      coordinates.push(coordinates[0]); // Close the polygon

      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle very small polygon", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.000001, 0],
              [0.000001, 0.000001],
              [0, 0.000001],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle polygon with collinear points", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [2, 0],
              [2, 1],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });

    it("should handle polygon with duplicate points", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 0], // Duplicate point
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.smoothed).toBeDefined();
      expect(result.outputs?.smoothed.type).toBe("Polygon");
    });
  });
});
