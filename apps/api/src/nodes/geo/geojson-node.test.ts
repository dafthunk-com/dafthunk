import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { GeoJsonNode } from "./geojson-node";

describe("GeoJsonNode", () => {
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

  const node = new GeoJsonNode({
    id: "test-node",
    name: "Test Node",
    type: "geojson",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Valid GeoJSON", () => {
    it("should parse valid Point geometry", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      });
      expect(result.outputs?.geojsonType).toBe("Point");
    });

    it("should parse valid LineString geometry", async () => {
      const context = createMockContext({
        json: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojsonType).toBe("LineString");
    });

    it("should parse valid Polygon geometry", async () => {
      const context = createMockContext({
        json: {
          type: "Polygon",
          coordinates: [
            [
              [-122.4194, 37.7749],
              [-122.4094, 37.7749],
              [-122.4094, 37.7849],
              [-122.4194, 37.7849],
              [-122.4194, 37.7749],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojsonType).toBe("Polygon");
    });

    it("should parse valid GeometryCollection", async () => {
      const context = createMockContext({
        json: {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-122.4194, 37.7749],
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojsonType).toBe("GeometryCollection");
    });

    it("should parse valid FeatureCollection", async () => {
      const context = createMockContext({
        json: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Sample Point" },
              geometry: {
                type: "Point",
                coordinates: [102.0, 0.5],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojsonType).toBe("FeatureCollection");
    });

    it("should parse valid Feature", async () => {
      const context = createMockContext({
        json: {
          type: "Feature",
          properties: { name: "Sample Point" },
          geometry: {
            type: "Point",
            coordinates: [102.0, 0.5],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojsonType).toBe("Feature");
    });
  });

  describe("Invalid inputs", () => {
    it("should handle missing JSON input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid or missing JSON input");
    });

    it("should handle non-object JSON input", async () => {
      const context = createMockContext({
        json: "not an object",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid or missing JSON input");
    });

    it("should handle invalid geometry", async () => {
      const context = createMockContext({
        json: {
          type: "Point",
          coordinates: [-122.4194], // Missing latitude
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid GeoJSON");
    });
  });
});
