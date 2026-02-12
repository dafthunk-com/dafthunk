import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { ConcaveNode } from "./concave-node";

describe("ConcaveNode", () => {
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

  const node = new ConcaveNode({
    id: "test-node",
    name: "Test Node",
    type: "concave",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return concave hull when given valid points", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Point 1" },
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
            {
              type: "Feature",
              properties: { name: "Point 2" },
              geometry: {
                type: "Point",
                coordinates: [3, 4],
              },
            },
            {
              type: "Feature",
              properties: { name: "Point 3" },
              geometry: {
                type: "Point",
                coordinates: [5, 6],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with simple FeatureCollection", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [3, 4],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 1],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with maxEdge parameter", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [3, 4],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [5, 6],
              },
            },
          ],
        },
        maxEdge: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with units parameter", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [3, 4],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [5, 6],
              },
            },
          ],
        },
        units: "kilometers",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with both maxEdge and units parameters", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [3, 4],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [5, 6],
              },
            },
          ],
        },
        maxEdge: 5,
        units: "miles",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with many points", async () => {
      const features = [];
      for (let i = 0; i < 10; i++) {
        features.push({
          type: "Feature",
          properties: { id: i },
          geometry: {
            type: "Point",
            coordinates: [i, i * 2],
          },
        });
      }

      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features,
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with points in a square pattern", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [2, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [2, 2],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 2],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with points in a triangle pattern", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [2, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with points in a line", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 0],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [2, 0],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with negative coordinates", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [-1, -1],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, -1],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0, 1],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should work with decimal coordinates", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [0.5, 0.5],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1.5, 0.5],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1.0, 1.5],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });
  });

  describe("Input validation", () => {
    it("should handle missing points input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing points input");
    });

    it("should handle null points input", async () => {
      const context = createMockContext({
        points: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing points input");
    });

    it("should handle undefined points input", async () => {
      const context = createMockContext({
        points: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing points input");
    });

    it("should handle invalid maxEdge type", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("MaxEdge must be a number");
    });

    it("should handle maxEdge as boolean", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("MaxEdge must be a number");
    });

    it("should handle maxEdge as zero", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("MaxEdge must be a positive number");
    });

    it("should handle maxEdge as negative number", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: -5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("MaxEdge must be a positive number");
    });

    it("should handle invalid units type", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        units: 123,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Units must be a string");
    });

    it("should handle units as boolean", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        units: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Units must be a string");
    });
  });

  describe("Edge cases", () => {
    it("should handle null maxEdge option", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle undefined maxEdge option", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle null units option", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        units: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle undefined units option", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        units: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle very small maxEdge value", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: 0.000001,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle very large maxEdge value", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
        maxEdge: 1000000,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle various unit strings", async () => {
      const units = ["kilometers", "miles", "meters", "feet", "inches"];

      for (const unit of units) {
        const context = createMockContext({
          points: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: [1, 2],
                },
              },
            ],
          },
          units: unit,
        });

        const result = await node.execute(context);

        expect(result.status).toBe("completed");
        expect(result.outputs?.concave).toBeDefined();
        expect(result.outputs?.concave.type).toBe("Feature");
        expect(result.outputs?.concave.geometry.type).toBe("Polygon");
      }
    });

    it("should handle single point", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });

    it("should handle two points", async () => {
      const context = createMockContext({
        points: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [1, 2],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [3, 4],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.concave).toBeDefined();
      expect(result.outputs?.concave.type).toBe("Feature");
      expect(result.outputs?.concave.geometry.type).toBe("Polygon");
    });
  });
});
