import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { FlipNode } from "./flip-node";

describe("FlipNode", () => {
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

  const node = new FlipNode({
    id: "test-node",
    name: "Test Node",
    type: "flip",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should process Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-122, 37],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.flipped).toBeDefined();
      expect(result.outputs?.flipped.type).toBe("Point");
      expect(result.outputs?.flipped.coordinates).toBeDefined();
    });

    it("should process LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [-122, 37],
            [-121, 38],
            [-120, 39],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.flipped).toBeDefined();
      expect(result.outputs?.flipped.type).toBe("LineString");
      expect(result.outputs?.flipped.coordinates).toBeDefined();
    });

    it("should process Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [-122, 37],
              [-121, 37],
              [-121, 38],
              [-122, 38],
              [-122, 37],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.flipped).toBeDefined();
      expect(result.outputs?.flipped.type).toBe("Polygon");
      expect(result.outputs?.flipped.coordinates).toBeDefined();
    });
  });

  describe("Feature inputs", () => {
    it("should process Point Feature and preserve properties", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Point", id: 1 },
          geometry: {
            type: "Point",
            coordinates: [-122, 37],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.flipped).toBeDefined();
      expect(result.outputs?.flipped.type).toBe("Feature");
      expect(result.outputs?.flipped.geometry).toBeDefined();
      expect(result.outputs?.flipped.properties).toEqual({
        name: "Test Point",
        id: 1,
      });
    });

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
                coordinates: [-122, 37],
              },
            },
            {
              type: "Feature",
              properties: { id: 2 },
              geometry: {
                type: "LineString",
                coordinates: [
                  [-121, 38],
                  [-120, 39],
                ],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.flipped).toBeDefined();
      expect(result.outputs?.flipped.type).toBe("FeatureCollection");
      expect(result.outputs?.flipped.features).toHaveLength(2);
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
