import { describe, expect, it } from "vitest";

import { SimplifyNode } from "./simplify-node";
import { NodeContext } from "../types";

describe("SimplifyNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new SimplifyNode({
    id: "test-node",
    name: "Test Node",
    type: "simplify",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should simplify a LineString", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4]
          ]
        },
        tolerance: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should simplify a Polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [[
            [0, 0],
            [1, 0],
            [2, 1],
            [3, 2],
            [4, 2],
            [4, 0],
            [0, 0]
          ]]
        },
        tolerance: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should work with Feature input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
              [2, 2]
            ]
          }
        },
        tolerance: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });
  });

  describe("Parameter handling", () => {
    it("should work without tolerance parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should work without highQuality parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should work with both parameters", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2]
          ]
        },
        tolerance: 2,
        highQuality: true
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({
        tolerance: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle null GeoJSON input", async () => {
      const context = createMockContext({
        geojson: null
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });
  });

  describe("Different geometry types", () => {
    it("should handle Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should handle MultiPoint geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [1, 1]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should handle MultiLineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
              [2, 2]
            ],
            [
              [3, 3],
              [4, 4],
              [5, 5]
            ]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should handle MultiPolygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [[
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0]
            ]],
            [[
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2]
            ]]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });

    it("should handle FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [0, 0],
                  [1, 1],
                  [2, 2]
                ]
              }
            }
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.simplified).toBeDefined();
    });
  });
}); 