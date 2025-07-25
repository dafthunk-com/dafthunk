import { describe, expect, it } from "vitest";

import { EnvelopeNode } from "./envelope-node";
import { NodeContext } from "../types";

describe("EnvelopeNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new EnvelopeNode({
    id: "test-node",
    name: "Test Node",
    type: "envelope",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Point geometry", () => {
    it("should calculate envelope for a single Point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.4194, 37.7749]);
    });

    it("should calculate envelope for MultiPoint", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.3994, 37.7949]);
    });
  });

  describe("LineString geometry", () => {
    it("should calculate envelope for LineString", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.3994, 37.7949]);
    });

    it("should calculate envelope for MultiLineString", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.3894, 37.8049]);
    });
  });

  describe("Polygon geometry", () => {
    it("should calculate envelope for Polygon", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.4094, 37.7849]);
    });

    it("should calculate envelope for MultiPolygon", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.3894, 37.8049]);
    });
  });

  describe("Feature and FeatureCollection", () => {
    it("should calculate envelope for Feature with Point geometry", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.4194, 37.7749]);
    });

    it("should calculate envelope for FeatureCollection", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.3994, 37.7949]);
    });

    it("should handle empty FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: []
        }
      });

      const result = await node.execute(context);

      // Turf.js actually handles empty FeatureCollections by returning a null envelope
      expect(result.status).toBe("error");
      expect(result.error).toContain("Unable to calculate envelope");
    });
  });

  describe("GeometryCollection", () => {
    it("should calculate envelope for GeometryCollection", async () => {
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.3994, 37.7949]);
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

    it("should handle Turf.js throwing an error", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [Infinity, NaN] // Invalid coordinates that might cause Turf to throw
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Unable to calculate envelope");
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
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.bbox).toEqual([-122.4194, 37.7749, -122.4194, 37.7749]);
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
      expect(result.outputs?.bbox).toEqual([-180, -90, -180, -90]);
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
      expect(result.outputs?.envelope).toBeDefined();
      // Turf should handle this correctly by creating a bbox that spans the antimeridian
      expect(result.outputs?.bbox).toEqual([-179, 0, 179, 0]);
    });
  });
}); 