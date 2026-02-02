import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { RoundNode } from "./round-node";

describe("RoundNode", () => {
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

  const node = new RoundNode({
    id: "test-node",
    name: "Test Node",
    type: "round",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return rounded coordinates when given valid geojson", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Feature" },
          geometry: {
            type: "Point",
            coordinates: [1.23456789, 2.3456789],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Feature");
      expect(result.outputs?.rounded.geometry.type).toBe("Point");
    });

    it("should work with simple point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should work with LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [1.23456789, 2.3456789],
            [3.45678901, 4.56789012],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("LineString");
    });

    it("should work with Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [1.23456789, 2.3456789],
              [3.45678901, 2.3456789],
              [3.45678901, 4.56789012],
              [1.23456789, 4.56789012],
              [1.23456789, 2.3456789],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Polygon");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should work with precision parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should work with precision set to 0", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should work with precision set to 10", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should work with MultiPoint geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [1.23456789, 2.3456789],
            [3.45678901, 4.56789012],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("MultiPoint");
    });

    it("should work with MultiLineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [1.23456789, 2.3456789],
              [3.45678901, 4.56789012],
            ],
            [
              [5.67890123, 6.78901234],
              [7.89012345, 8.90123456],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("MultiLineString");
    });

    it("should work with MultiPolygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [1.23456789, 2.3456789],
                [3.45678901, 2.3456789],
                [3.45678901, 4.56789012],
                [1.23456789, 4.56789012],
                [1.23456789, 2.3456789],
              ],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("MultiPolygon");
    });
  });

  describe("Input validation", () => {
    it("should handle missing geojson input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle null geojson input", async () => {
      const context = createMockContext({
        geojson: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle undefined geojson input", async () => {
      const context = createMockContext({
        geojson: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle invalid precision type", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Precision must be a number");
    });

    it("should handle precision as boolean", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Precision must be a number");
    });

    it("should handle negative precision", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: -1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Precision must be a non-negative number");
    });

    it("should handle invalid mutate type", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        mutate: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });

    it("should handle mutate as number", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        mutate: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });
  });

  describe("Edge cases", () => {
    it("should handle null precision option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle undefined precision option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        precision: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle null mutate option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        mutate: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle undefined mutate option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
        mutate: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle very large coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [123456789.1234567, 987654321.9876543],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle very small coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0.000000001, 0.000000002],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle negative coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-1.23456789, -2.3456789],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });

    it("should handle zero coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rounded).toBeDefined();
      expect(result.outputs?.rounded.type).toBe("Point");
    });
  });
});
