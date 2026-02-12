import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { ExplodeNode } from "./explode-node";

describe("ExplodeNode", () => {
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

  const node = new ExplodeNode({
    id: "test-node",
    name: "Test Node",
    type: "explode",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should process Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [10, 20],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.points).toBeDefined();
      expect(result.outputs?.points.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.points.features)).toBe(true);
    });

    it("should process LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [10, 20],
            [30, 40],
            [50, 60],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.points).toBeDefined();
      expect(result.outputs?.points.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.points.features)).toBe(true);
    });

    it("should process Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [10, 20],
              [30, 20],
              [30, 40],
              [10, 40],
              [10, 20],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.points).toBeDefined();
      expect(result.outputs?.points.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.points.features)).toBe(true);
    });
  });

  describe("Feature inputs", () => {
    it("should process Point Feature", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [10, 20],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.points).toBeDefined();
      expect(result.outputs?.points.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.points.features)).toBe(true);
    });

    it("should process LineString Feature", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Line" },
          geometry: {
            type: "LineString",
            coordinates: [
              [10, 20],
              [30, 40],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.points).toBeDefined();
      expect(result.outputs?.points.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.points.features)).toBe(true);
    });
  });

  describe("FeatureCollection input", () => {
    it("should process FeatureCollection", async () => {
      const context = createMockContext({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { id: 1 },
              geometry: {
                type: "Point",
                coordinates: [10, 20],
              },
            },
            {
              type: "Feature",
              properties: { id: 2 },
              geometry: {
                type: "LineString",
                coordinates: [
                  [30, 40],
                  [50, 60],
                ],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.points).toBeDefined();
      expect(result.outputs?.points.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.points.features)).toBe(true);
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
        geojson: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });
  });
});
