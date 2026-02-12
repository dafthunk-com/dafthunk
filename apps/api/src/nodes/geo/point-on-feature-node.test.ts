import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { PointOnFeatureNode } from "./point-on-feature-node";

describe("PointOnFeatureNode", () => {
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

  const node = new PointOnFeatureNode({
    id: "test-node",
    name: "Test Node",
    type: "point-on-feature",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return a point when given a valid polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Polygon" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should return a point when given a valid linestring", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test LineString" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
              [2, 2],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should return a point when given a valid point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should work with simple polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
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
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should work with simple linestring geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should work with simple point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });
  });

  describe("Input validation", () => {
    it("should handle missing geojson input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle null geojson input", async () => {
      const context = createMockContext({
        geojson: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle undefined geojson input", async () => {
      const context = createMockContext({
        geojson: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });
  });

  describe("Edge cases", () => {
    it("should handle polygon with integer coordinates", async () => {
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
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should handle linestring with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, 5],
            [10, 10],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should handle point with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [5, 5],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });
  });
});
