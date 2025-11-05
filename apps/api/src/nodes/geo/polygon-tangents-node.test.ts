import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { PolygonTangentsNode } from "./polygon-tangents-node";

describe("PolygonTangentsNode", () => {
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

  const node = new PolygonTangentsNode({
    id: "test-node",
    name: "Test Node",
    type: "polygon-tangents",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return tangents when given valid point and polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        polygon: {
          type: "Feature",
          properties: { name: "Test Polygon" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [1, 1],
                [1, -1],
                [-1, -1],
                [-1, 1],
                [1, 1],
              ],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should work with simple point and polygon geometry", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [10, 10],
              [10, -10],
              [-10, -10],
              [-10, 10],
              [10, 10],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should work with point outside the polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [5, 5],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should work with point far from the polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [100, 100],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });
  });

  describe("Input validation", () => {
    it("should handle missing point input", async () => {
      const context = createMockContext({
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point input");
    });

    it("should handle missing polygon input", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });

    it("should handle null point input", async () => {
      const context = createMockContext({
        point: null,
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point input");
    });

    it("should handle null polygon input", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });
  });

  describe("Edge cases", () => {
    it("should handle point very close to polygon boundary", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [1.1, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should handle point on polygon boundary", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [1, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should handle point inside the polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should handle large polygon with small point distance", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1000, 1000],
              [1000, -1000],
              [-1000, -1000],
              [-1000, 1000],
              [1000, 1000],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });

    it("should handle small polygon with large point distance", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [1000, 1000],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.tangents).toBeDefined();
      expect(result.outputs?.tangents.type).toBe("FeatureCollection");
      expect(Array.isArray(result.outputs?.tangents.features)).toBe(true);
      expect(result.outputs?.tangents.features.length).toBe(2);
    });
  });
});
