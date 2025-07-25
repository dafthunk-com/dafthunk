import { describe, expect, it } from "vitest";

import { BufferNode } from "./buffer-node";
import { NodeContext } from "../types";

describe("BufferNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new BufferNode({
    id: "test-node",
    name: "Test Node",
    type: "buffer",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Point geometry", () => {
    it("should create buffer around a Point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.type).toBe("Feature");
      expect(result.outputs?.buffer.geometry.type).toBe("Polygon");
      expect(result.outputs?.buffer.geometry.coordinates).toBeDefined();
      expect(Array.isArray(result.outputs?.buffer.geometry.coordinates[0])).toBe(true);
    });

    it("should create buffer around MultiPoint", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849]
          ]
        },
        radius: 0.5
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
    });
  });

  describe("LineString geometry", () => {
    it("should create buffer around LineString", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849],
            [-122.3994, 37.7949]
          ]
        },
        radius: 0.5
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
    });

    it("should create buffer around MultiLineString", async () => {
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
        },
        radius: 0.3
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
    });
  });

  describe("Polygon geometry", () => {
    it("should create buffer around Polygon", async () => {
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
        },
        radius: 0.5
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
    });

    it("should create negative buffer (shrink) for Polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [[
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
            [-122.5, 37.7]
          ]]
        },
        radius: -0.01 // Small negative buffer
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
    });

    it("should handle MultiPolygon", async () => {
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
        },
        radius: 0.2
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
    });
  });

  describe("Feature and FeatureCollection", () => {
    it("should create buffer for Feature with Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [-122.4194, 37.7749]
          }
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.type).toBe("Feature");
      expect(result.outputs?.buffer.geometry.type).toBe("Polygon");
    });

    it("should create buffer for FeatureCollection", async () => {
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
        },
        radius: 0.5
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.buffer.features)).toBe(true);
    });

    it("should handle empty FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: []
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
      expect(result.outputs?.buffer.type).toBe("FeatureCollection");
      expect(result.outputs?.buffer.features).toHaveLength(0);
    });
  });

  describe("GeometryCollection", () => {
    it("should create buffer for GeometryCollection", async () => {
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
        },
        radius: 0.5
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });
  });

  describe("Units parameter", () => {
    it("should work with miles", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1,
        units: "miles"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should work with meters", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1000,
        units: "meters"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should work with degrees", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 0.01,
        units: "degrees"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should default to kilometers when units not specified", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should reject invalid units", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1,
        units: "invalid-unit"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid units");
    });
  });

  describe("Steps parameter", () => {
    it("should work with custom steps", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1,
        steps: 16
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should default to 8 steps when not specified", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should reject invalid steps", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1,
        steps: -1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Steps must be a positive number");
    });

    it("should floor decimal steps", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1,
        steps: 12.7
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });
  });

  describe("Radius parameter", () => {
    it("should work with zero radius", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 0
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should work with very small positive radius", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 0.001
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should work with large radius", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: 100
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle missing radius input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing radius input");
    });

    it("should handle null radius input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: null
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing radius input");
    });

    it("should handle invalid radius (string)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: "invalid"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Radius must be a valid number");
    });

    it("should handle invalid radius (NaN)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: NaN
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Radius must be a valid number");
    });

    it("should handle invalid radius (Infinity)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        },
        radius: Infinity
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Radius must be a valid number");
    });

    it("should handle null GeoJSON input", async () => {
      const context = createMockContext({
        geojson: null,
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle non-object GeoJSON input", async () => {
      const context = createMockContext({
        geojson: "not an object",
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid GeoJSON object provided");
    });

    it("should handle object without type property", async () => {
      const context = createMockContext({
        geojson: {
          coordinates: [-122.4194, 37.7749]
        },
        radius: 1
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
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid GeoJSON object provided");
    });

    it("should handle very large negative buffer that becomes invalid", async () => {
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
        },
        radius: -100 // Very large negative buffer
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Unable to calculate buffer");
    });
  });

  describe("Edge cases", () => {
    it("should handle coordinates with elevation (3D)", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749, 100]
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should handle coordinates at extremes", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-180, -90]
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });

    it("should handle polygon with holes", async () => {
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
        },
        radius: 0.01
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.buffer).toBeDefined();
    });
  });
}); 