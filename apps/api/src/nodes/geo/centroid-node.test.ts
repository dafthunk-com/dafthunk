import { describe, expect, it } from "vitest";

import { CentroidNode } from "./centroid-node";
import { NodeContext } from "../types";

describe("CentroidNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new CentroidNode({
    id: "test-node",
    name: "Test Node",
    type: "centroid",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Point geometry", () => {
    it("should calculate centroid for a single Point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.centroid.type).toBe("Feature");
      expect(result.outputs?.centroid.geometry.type).toBe("Point");
      expect(result.outputs?.coordinates).toEqual([-122.4194, 37.7749]);
    });

    it("should calculate centroid for MultiPoint", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849],
            [-122.3994, 37.7949]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
      expect(Array.isArray(result.outputs?.coordinates)).toBe(true);
      expect(result.outputs?.coordinates).toHaveLength(2);
    });
  });

  describe("LineString geometry", () => {
    it("should calculate centroid for LineString", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849],
            [-122.3994, 37.7949]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
      expect(Array.isArray(result.outputs?.coordinates)).toBe(true);
    });

    it("should calculate centroid for MultiLineString", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [-122.4194, 37.7749],
              [-122.4094, 37.7849]
            ],
            [
              [-122.3994, 37.7949],
              [-122.3894, 37.8049]
            ]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
    });
  });

  describe("Polygon geometry", () => {
    it("should calculate centroid for Polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [[
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849],
            [-122.4194, 37.7849],
            [-122.4194, 37.7749]
          ]]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
      // For a rectangle, centroid should be roughly in the center
      const coords = result.outputs?.coordinates as number[];
      expect(coords[0]).toBeCloseTo(-122.4144, 3); // Longitude center
      expect(coords[1]).toBeCloseTo(37.7799, 3);   // Latitude center
    });

    it("should calculate centroid for MultiPolygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [[
              [-122.4194, 37.7749],
              [-122.4094, 37.7749],
              [-122.4094, 37.7849],
              [-122.4194, 37.7849],
              [-122.4194, 37.7749]
            ]],
            [[
              [-122.3994, 37.7949],
              [-122.3894, 37.7949],
              [-122.3894, 37.8049],
              [-122.3994, 37.8049],
              [-122.3994, 37.7949]
            ]]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
    });
  });

  describe("Feature and FeatureCollection", () => {
    it("should calculate centroid for Feature with Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [-122.4194, 37.7749]
          }
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toEqual([-122.4194, 37.7749]);
    });

    it("should calculate centroid for FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Point A" },
              geometry: {
                type: "Point",
                coordinates: [-122.4194, 37.7749]
              }
            },
            {
              type: "Feature",
              properties: { name: "Point B" },
              geometry: {
                type: "Point",
                coordinates: [-122.3994, 37.7949]
              }
            }
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
    });

    it("should handle empty FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: []
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Error calculating centroid");
    });
  });

  describe("GeometryCollection", () => {
    it("should calculate centroid for GeometryCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-122.4194, 37.7749]
            },
            {
              type: "LineString",
              coordinates: [
                [-122.4094, 37.7849],
                [-122.3994, 37.7949]
              ]
            }
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
    });
  });

  describe("Properties handling", () => {
    it("should attach custom properties to centroid", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        properties: {
          name: "Custom Centroid",
          category: "test",
          value: 42
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.properties).toEqual({
        name: "Custom Centroid",
        category: "test",
        value: 42
      });
    });

    it("should work without properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.properties).toEqual({});
    });

    it("should ignore non-object properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        properties: "invalid properties"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.properties).toEqual({});
    });
  });

  describe("Error handling", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({});

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

    it("should handle non-object GeoJSON input", async () => {
      const context = createMockContext({
        geojson: "not an object"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid GeoJSON object provided");
    });

    it("should handle object without type property", async () => {
      const context = createMockContext({
        geojson: {
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid GeoJSON object provided");
    });

    it("should handle invalid GeoJSON type", async () => {
      const context = createMockContext({
        geojson: {
          type: "InvalidType",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid GeoJSON object provided");
    });
  });

  describe("Edge cases", () => {
    it("should handle coordinates with elevation (3D)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749, 100]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      // Centroid should only have 2D coordinates
      expect(result.outputs?.coordinates).toHaveLength(2);
      expect(result.outputs?.coordinates).toEqual([-122.4194, 37.7749]);
    });

    it("should handle very large coordinate values", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-180, -90]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.coordinates).toEqual([-180, -90]);
    });

    it("should handle coordinates crossing the antimeridian", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [179, 0],
            [-179, 0]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
      expect(Array.isArray(result.outputs?.coordinates)).toBe(true);
      expect(result.outputs?.coordinates).toHaveLength(2);
    });

    it("should handle complex polygon with holes", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            // Outer ring
            [
              [-122.45, 37.75],
              [-122.35, 37.75],
              [-122.35, 37.85],
              [-122.45, 37.85],
              [-122.45, 37.75]
            ],
            // Inner ring (hole)
            [
              [-122.42, 37.78],
              [-122.38, 37.78],
              [-122.38, 37.82],
              [-122.42, 37.82],
              [-122.42, 37.78]
            ]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.coordinates).toBeDefined();
    });
  });
}); 