import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BboxClipNode } from "./bbox-clip-node";

describe("BboxClipNode", () => {
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

  const node = new BboxClipNode({
    id: "test-node",
    name: "Test Node",
    type: "bbox-clip",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return clipped geometry when given valid geojson and bbox", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Feature" },
          geometry: {
            type: "Point",
            coordinates: [1, 2],
          },
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Feature");
      expect(result.outputs?.clipped.geometry.type).toBe("Point");
    });

    it("should work with simple point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should work with LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [1, 2],
            [3, 4],
          ],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("LineString");
    });

    it("should work with Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [1, 2],
              [3, 2],
              [3, 4],
              [1, 4],
              [1, 2],
            ],
          ],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Polygon");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should work with decimal bbox coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0.5, 0.5, 5.5, 5.5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should work with negative bbox coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [-5, -5, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should work with MultiPoint geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [1, 2],
            [3, 4],
          ],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("MultiPoint");
    });

    it("should work with MultiLineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [1, 2],
              [3, 4],
            ],
            [
              [5, 6],
              [7, 8],
            ],
          ],
        },
        bbox: [0, 0, 10, 10],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("MultiLineString");
    });

    it("should work with MultiPolygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [1, 2],
                [3, 2],
                [3, 4],
                [1, 4],
                [1, 2],
              ],
            ],
          ],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("MultiPolygon");
    });

    it("should work with FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
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
          ],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("FeatureCollection");
    });

    it("should work with very small bbox", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0.9, 1.9, 1.1, 2.1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should work with very large bbox", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [-1000, -1000, 1000, 1000],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should work with zero-sized bbox", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [1, 2, 1, 2],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });
  });

  describe("Input validation", () => {
    it("should handle missing geojson input", async () => {
      const context = createMockContext({
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle null geojson input", async () => {
      const context = createMockContext({
        geojson: null,
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle undefined geojson input", async () => {
      const context = createMockContext({
        geojson: undefined,
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle missing bbox input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle null bbox input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle undefined bbox input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle bbox that is not an array", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: "not an array",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox must be an array");
    });

    it("should handle bbox as number", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: 123,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox must be an array");
    });

    it("should handle bbox as boolean", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox must be an array");
    });

    it("should handle bbox with wrong number of elements (3)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must have exactly 4 elements [west, south, east, north]"
      );
    });

    it("should handle bbox with wrong number of elements (5)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, 5, 5, 10],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must have exactly 4 elements [west, south, east, north]"
      );
    });

    it("should handle bbox with empty array", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must have exactly 4 elements [west, south, east, north]"
      );
    });

    it("should handle bbox with non-number elements (string)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, "5", 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 2 must be a number");
    });

    it("should handle bbox with non-number elements (boolean)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, 5, true],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 3 must be a number");
    });

    it("should handle bbox with non-number elements (null)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, null, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 1 must be a number");
    });

    it("should handle bbox with non-number elements (undefined)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [undefined, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Bbox element at index 0 must be a number");
    });
  });

  describe("Edge cases", () => {
    it("should handle bbox with all zero values", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 0, 0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle bbox with negative values", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [-5, -5, -1, -1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle bbox with very large values", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [1000000, 1000000, 2000000, 2000000],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle bbox with very small values", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0.000001, 0.000001, 0.000002, 0.000002],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle bbox with mixed positive and negative values", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [-5, -5, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle bbox where east is less than west", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [5, 0, 0, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle bbox where north is less than south", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
        bbox: [0, 5, 5, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle point outside bbox", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [10, 10],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle point exactly on bbox boundary", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });

    it("should handle point exactly on bbox corner", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
        bbox: [0, 0, 5, 5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.clipped).toBeDefined();
      expect(result.outputs?.clipped.type).toBe("Point");
    });
  });
});
