import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { TransformRotateNode } from "./transform-rotate-node";

describe("TransformRotateNode", () => {
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

  const node = new TransformRotateNode({
    id: "test-node",
    name: "Test Node",
    type: "transformRotate",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Input validation", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle missing angle input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing angle input");
    });

    it("should handle null angle input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing angle input");
    });

    it("should handle invalid angle type", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Angle must be a valid number");
    });

    it("should handle infinite angle", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: Infinity,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Angle must be a valid number");
    });

    it("should handle NaN angle", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: NaN,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Angle must be a valid number");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        geojson: null,
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });
  });

  describe("Successful execution", () => {
    it("should rotate Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
      expect(result.outputs?.rotated.type).toBe("Point");
      expect(Array.isArray(result.outputs?.rotated.coordinates)).toBe(true);
    });

    it("should rotate Point with custom pivot", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [2, 1],
        },
        angle: 90,
        pivot: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
      expect(result.outputs?.rotated.type).toBe("Point");
    });

    it("should rotate LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        },
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
      expect(result.outputs?.rotated.type).toBe("LineString");
      expect(Array.isArray(result.outputs?.rotated.coordinates)).toBe(true);
    });

    it("should rotate Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
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
        angle: 45,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
      expect(result.outputs?.rotated.type).toBe("Polygon");
      expect(Array.isArray(result.outputs?.rotated.coordinates)).toBe(true);
    });

    it("should rotate Feature and preserve properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: {
            name: "Test Feature",
            id: 123,
          },
          geometry: {
            type: "Point",
            coordinates: [1, 0],
          },
        },
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated.type).toBe("Feature");
      expect(result.outputs?.rotated.properties).toEqual({
        name: "Test Feature",
        id: 123,
      });
    });

    it("should rotate FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { id: 1 },
              geometry: {
                type: "Point",
                coordinates: [1, 0],
              },
            },
            {
              type: "Feature",
              properties: { id: 2 },
              geometry: {
                type: "LineString",
                coordinates: [
                  [0, 1],
                  [1, 1],
                ],
              },
            },
          ],
        },
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated.type).toBe("FeatureCollection");
      expect(result.outputs?.rotated.features).toHaveLength(2);
      expect(result.outputs?.rotated.features[0].properties).toEqual({ id: 1 });
      expect(result.outputs?.rotated.features[1].properties).toEqual({ id: 2 });
    });

    it("should handle negative angles", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: -90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
    });

    it("should handle zero angle", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [3, 4],
        },
        angle: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
    });

    it("should handle large angles", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0],
        },
        angle: 450,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
    });

    it("should work with Feature pivot point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [2, 1],
        },
        angle: 90,
        pivot: {
          type: "Feature",
          properties: { name: "Pivot" },
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated).toBeDefined();
    });

    it("should handle MultiPoint geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [1, 0],
            [0, 1],
            [-1, 0],
          ],
        },
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated.type).toBe("MultiPoint");
      expect(result.outputs?.rotated.coordinates).toHaveLength(3);
    });

    it("should handle 3D coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 0, 100],
        },
        angle: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rotated.coordinates).toHaveLength(3);
    });
  });
});
