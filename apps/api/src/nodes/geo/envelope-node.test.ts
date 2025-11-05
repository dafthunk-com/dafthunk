import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { EnvelopeNode } from "./envelope-node";

describe("EnvelopeNode", () => {
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

  const node = new EnvelopeNode({
    id: "test-node",
    name: "Test Node",
    type: "envelope",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should create envelope for a point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope).toBeDefined();
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
    });

    it("should create envelope for a polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
    });

    it("should create envelope for a linestring", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 2],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
    });

    it("should create envelope for multipoint", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [4, 2],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
    });
  });

  describe("Feature inputs", () => {
    it("should work with Feature input", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Feature" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [4, 0],
                [4, 2],
                [0, 2],
                [0, 0],
              ],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
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
                coordinates: [4, 2],
              },
            },
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.envelope.type).toBe("Feature");
      expect(result.outputs?.envelope.geometry.type).toBe("Polygon");
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
