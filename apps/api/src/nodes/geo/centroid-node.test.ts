import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CentroidNode } from "./centroid-node";

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

  describe("Node execution", () => {
    it("should successfully calculate centroid with basic polygon", async () => {
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
      expect(result.outputs?.centroid).toBeDefined();
      expect(result.outputs?.centroid.type).toBe("Feature");
      expect(result.outputs?.centroid.geometry.type).toBe("Point");
    });

    it("should work with Feature input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Polygon" },
          geometry: {
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
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.type).toBe("Feature");
      expect(result.outputs?.centroid.geometry.type).toBe("Point");
    });

    it("should work with FeatureCollection input", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { id: 1 },
              geometry: {
                type: "Point",
                coordinates: [0, 0],
              },
            },
            {
              type: "Feature",
              properties: { id: 2 },
              geometry: {
                type: "Point",
                coordinates: [2, 2],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.type).toBe("Feature");
      expect(result.outputs?.centroid.geometry.type).toBe("Point");
    });
  });

  describe("Properties handling", () => {
    it("should handle properties parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 1],
        },
        properties: {
          name: "Test Centroid",
          id: 123,
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.type).toBe("Feature");
      expect(result.outputs?.centroid.properties).toBeDefined();
    });

    it("should handle empty properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 1],
        },
        properties: {},
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.properties).toBeDefined();
    });

    it("should handle no properties specified", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid.properties).toBeDefined();
    });

    it("should handle null properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 1],
        },
        properties: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centroid).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle null input", async () => {
      const context = createMockContext({
        geojson: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });
  });
});
