import { describe, expect, it } from "vitest";

import { CleanCoordsNode } from "./clean-coords-node";
import { NodeContext } from "../types";

describe("CleanCoordsNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new CleanCoordsNode({
    id: "test-node",
    name: "Test Node",
    type: "clean-coords",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return cleaned coordinates when given valid geojson", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Feature" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [0, 2],
              [0, 5],
              [0, 8],
              [0, 8],
              [0, 10]
            ]
          }
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("Feature");
      expect(result.outputs?.cleaned.geometry.type).toBe("LineString");
    });

    it("should work with simple geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 0],
            [2, 2],
            [2, 2],
            [4, 4]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should work with MultiPoint geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [0, 0],
            [2, 2],
            [2, 2],
            [4, 4]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("MultiPoint");
    });

    it("should work with Polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 0],
              [1, 0],
              [1, 1],
              [1, 1],
              [0, 1],
              [0, 0]
            ]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("Polygon");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 0],
            [10, 10],
            [10, 10],
            [20, 20]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should work with mutate option set to true", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 0],
            [2, 2]
          ]
        },
        mutate: true
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should work with mutate option set to false", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 0],
            [2, 2]
          ]
        },
        mutate: false
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
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
        geojson: null
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle undefined geojson input", async () => {
      const context = createMockContext({
        geojson: undefined
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle invalid mutate type", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        },
        mutate: "not a boolean"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });

    it("should handle mutate as number", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        },
        mutate: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });

    it("should handle mutate as object", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        },
        mutate: { value: true }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });
  });

  describe("Edge cases", () => {
    it("should handle null mutate option", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        },
        mutate: null
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should handle undefined mutate option", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        },
        mutate: undefined
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should handle geometry with no redundant coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should handle geometry with all identical coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("LineString");
    });

    it("should handle Point geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("Point");
    });

    it("should handle MultiLineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [0, 0],
              [1, 1]
            ],
            [
              [2, 2],
              [2, 2],
              [3, 3]
            ]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("MultiLineString");
    });

    it("should handle MultiPolygon geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0]
              ]
            ]
          ]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.cleaned).toBeDefined();
      expect(result.outputs?.cleaned.type).toBe("MultiPolygon");
    });
  });
}); 