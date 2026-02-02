import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { TransformScaleNode } from "./transform-scale-node";

describe("TransformScaleNode", () => {
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

  const node = new TransformScaleNode({
    id: "test-node",
    name: "Test Node",
    type: "transformScale",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should scale a polygon successfully", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        factor: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
      expect(result.outputs?.scaled.type).toBe("Polygon");
    });

    it("should scale a point successfully", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
        factor: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
      expect(result.outputs?.scaled.type).toBe("Point");
    });

    it("should scale a LineString successfully", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 10],
            [20, 0],
          ],
        },
        factor: 1.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
      expect(result.outputs?.scaled.type).toBe("LineString");
    });

    it("should handle factor of 1 (no change)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        factor: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
    });
  });

  describe("Input validation", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({
        factor: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle missing factor input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing factor input");
    });

    it("should handle null factor", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
        factor: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing factor input");
    });

    it("should handle invalid factor type", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
        factor: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Factor must be a valid number");
    });

    it("should handle infinite factor", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
        factor: Infinity,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Factor must be a valid number");
    });
  });

  describe("Optional parameters", () => {
    it("should handle origin parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        factor: 2,
        origin: {
          type: "Point",
          coordinates: [5, 5],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
    });

    it("should handle Feature origin", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        factor: 2,
        origin: {
          type: "Feature",
          properties: { name: "Origin" },
          geometry: {
            type: "Point",
            coordinates: [5, 5],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
    });

    it("should handle null origin", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        factor: 2,
        origin: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
    });
  });

  describe("Different geometry types", () => {
    it("should handle MultiPoint", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [10, 10],
            [20, 0],
          ],
        },
        factor: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
      expect(result.outputs?.scaled.type).toBe("MultiPoint");
    });

    it("should handle MultiLineString", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [10, 10],
            ],
            [
              [20, 0],
              [30, 10],
            ],
          ],
        },
        factor: 1.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
      expect(result.outputs?.scaled.type).toBe("MultiLineString");
    });

    it("should handle MultiPolygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ],
            [
              [
                [20, 20],
                [30, 20],
                [30, 30],
                [20, 30],
                [20, 20],
              ],
            ],
          ],
        },
        factor: 0.8,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled).toBeDefined();
      expect(result.outputs?.scaled.type).toBe("MultiPolygon");
    });

    it("should handle Feature and preserve properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: {
            name: "Test Polygon",
            area: 100,
            category: "building",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ],
          },
        },
        factor: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled.type).toBe("Feature");
      expect(result.outputs?.scaled.properties).toEqual({
        name: "Test Polygon",
        area: 100,
        category: "building",
      });
      expect(result.outputs?.scaled.geometry.type).toBe("Polygon");
    });

    it("should handle FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { id: 1 },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10],
                    [0, 0],
                  ],
                ],
              },
            },
            {
              type: "Feature",
              properties: { id: 2 },
              geometry: {
                type: "Point",
                coordinates: [20, 20],
              },
            },
          ],
        },
        factor: 2.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.scaled.type).toBe("FeatureCollection");
      expect(result.outputs?.scaled.features).toHaveLength(2);
      expect(result.outputs?.scaled.features[0].properties).toEqual({ id: 1 });
      expect(result.outputs?.scaled.features[1].properties).toEqual({ id: 2 });
    });
  });

  describe("Error handling", () => {
    it("should handle null inputs", async () => {
      const context = createMockContext({
        geojson: null,
        factor: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle undefined inputs", async () => {
      const context = createMockContext({
        geojson: undefined,
        factor: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle undefined factor", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
        factor: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing factor input");
    });
  });
});
