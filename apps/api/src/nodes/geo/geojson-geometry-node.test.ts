import { describe, expect, it } from "vitest";

import { GeoJsonGeometryNode } from "./geojson-geometry-node";
import { NodeContext } from "../types";

describe("GeoJsonGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new GeoJsonGeometryNode({
    id: "test-node",
    name: "Test Node",
    type: "geojson-geometry",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Point geometry", () => {
    it("should parse valid Point geometry", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geometry).toEqual({
        type: "Point",
        coordinates: [-122.4194, 37.7749]
      });
      expect(result.outputs?.geometryType).toBe("Point");
    });

    it("should parse valid Point geometry with elevation", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: [-122.4194, 37.7749, 100]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geometry).toEqual({
        type: "Point",
        coordinates: [-122.4194, 37.7749, 100]
      });
    });

    it("should reject invalid Point coordinates", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: [-122.4194] // Missing latitude
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("coordinates structure is malformed");
    });
  });

  describe("MultiPoint geometry", () => {
    it("should parse valid MultiPoint geometry", async () => {
      const context = createMockContext({
        json: {
          type: "MultiPoint",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geometryType).toBe("MultiPoint");
    });
  });

  describe("LineString geometry", () => {
    it("should parse valid LineString geometry", async () => {
      const context = createMockContext({
        json: {
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
      expect(result.outputs?.geometryType).toBe("LineString");
    });

    it("should reject LineString with insufficient coordinates", async () => {
      const context = createMockContext({
        json: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749] // Only one point, need at least 2
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("coordinates structure is malformed");
    });
  });

  describe("Polygon geometry", () => {
    it("should parse valid Polygon geometry", async () => {
      const context = createMockContext({
        json: {
          type: "Polygon",
          coordinates: [[
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849],
            [-122.4194, 37.7849],
            [-122.4194, 37.7749] // Closing coordinate
          ]]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geometryType).toBe("Polygon");
    });

    it("should reject Polygon with insufficient coordinates", async () => {
      const context = createMockContext({
        json: {
          type: "Polygon",
          coordinates: [[
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849] // Only 3 points, need at least 4 to close
          ]]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("coordinates structure is malformed");
    });
  });

  describe("GeometryCollection", () => {
    it("should parse valid GeometryCollection", async () => {
      const context = createMockContext({
        json: {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-122.4194, 37.7749]
            },
            {
              type: "LineString",
              coordinates: [
                [-122.4194, 37.7749],
                [-122.4094, 37.7849]
              ]
            }
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geometryType).toBe("GeometryCollection");
    });

    it("should reject GeometryCollection with invalid geometries", async () => {
      const context = createMockContext({
        json: {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-122.4194] // Invalid Point
            }
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
    });
  });

  describe("Error handling", () => {
    it("should handle missing JSON input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid or missing JSON input");
    });

    it("should handle non-object JSON input", async () => {
      const context = createMockContext({
        json: "not an object"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid or missing JSON input");
    });

    it("should handle missing type property", async () => {
      const context = createMockContext({
        json: {
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing 'type' property in GeoJSON geometry");
    });

    it("should handle missing coordinates property", async () => {
      const context = createMockContext({
        json: {
          type: "Point"
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing 'coordinates' property in GeoJSON geometry");
    });

    it("should handle invalid geometry type", async () => {
      const context = createMockContext({
        json: {
          type: "InvalidType",
          coordinates: [-122.4194, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid geometry type 'InvalidType'");
    });

    it("should handle coordinates with NaN values", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: [NaN, 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("coordinates structure is malformed");
    });

    it("should handle coordinates with non-numeric values", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: ["invalid", 37.7749]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("coordinates structure is malformed");
    });
  });
}); 