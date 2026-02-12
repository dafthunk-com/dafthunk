import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { TruncateNode } from "./truncate-node";

describe("TruncateNode", () => {
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

  const node = new TruncateNode({
    id: "test-node",
    name: "Test Node",
    type: "truncate",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return truncated coordinates when given valid geojson", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Feature" },
          geometry: {
            type: "Point",
            coordinates: [1.23456789, 2.3456789, 3.45678901],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Feature");
      expect(result.outputs?.truncated.geometry.type).toBe("Point");
    });

    it("should work with simple point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [1.23456789, 2.3456789, 3.45678901],
            [4.56789012, 5.67890123, 6.78901234],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("LineString");
    });

    it("should work with Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [1.23456789, 2.3456789, 3.45678901],
              [4.56789012, 2.3456789, 3.45678901],
              [4.56789012, 5.67890123, 3.45678901],
              [1.23456789, 5.67890123, 3.45678901],
              [1.23456789, 2.3456789, 3.45678901],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Polygon");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 2, 3],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with precision parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with coordinates parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with coordinates parameter set to 3", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with precision set to 0", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with precision set to 10", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with both precision and coordinates parameters", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: 2,
        coordinates: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should work with MultiPoint geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [1.23456789, 2.3456789, 3.45678901],
            [4.56789012, 5.67890123, 6.78901234],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("MultiPoint");
    });

    it("should work with MultiLineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [1.23456789, 2.3456789, 3.45678901],
              [4.56789012, 5.67890123, 6.78901234],
            ],
            [
              [7.89012345, 8.90123456, 9.01234567],
              [10.12345678, 11.23456789, 12.3456789],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("MultiLineString");
    });

    it("should work with MultiPolygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [1.23456789, 2.3456789, 3.45678901],
                [4.56789012, 2.3456789, 3.45678901],
                [4.56789012, 5.67890123, 3.45678901],
                [1.23456789, 5.67890123, 3.45678901],
                [1.23456789, 2.3456789, 3.45678901],
              ],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("MultiPolygon");
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
          coordinates: [1.23456789, 2.3456789, 3.45678901],
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
          coordinates: [1.23456789, 2.3456789, 3.45678901],
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
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: -1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Precision must be a non-negative number");
    });

    it("should handle invalid coordinates type", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: "not a number",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Coordinates must be a number");
    });

    it("should handle coordinates as boolean", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Coordinates must be a number");
    });

    it("should handle coordinates less than 2", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Coordinates must be at least 2");
    });

    it("should handle coordinates equal to 0", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Coordinates must be at least 2");
    });

    it("should handle invalid mutate type", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
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
          coordinates: [1.23456789, 2.3456789, 3.45678901],
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
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle undefined precision option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        precision: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle null coordinates option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle undefined coordinates option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        coordinates: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle null mutate option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        mutate: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle undefined mutate option", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789, 3.45678901],
        },
        mutate: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle very large coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [123456789.1234567, 987654321.9876543, 555666777.888999],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle very small coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0.000000001, 0.000000002, 0.000000003],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle negative coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [-1.23456789, -2.3456789, -3.45678901],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle zero coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });

    it("should handle coordinates with only 2 dimensions", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1.23456789, 2.3456789],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.truncated).toBeDefined();
      expect(result.outputs?.truncated.type).toBe("Point");
    });
  });
});
