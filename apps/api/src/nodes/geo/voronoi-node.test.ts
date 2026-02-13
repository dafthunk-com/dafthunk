import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { VoronoiNode } from "./voronoi-node";

describe("VoronoiNode", () => {
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

  const node = new VoronoiNode({
    id: "test-node",
    name: "Test Node",
    type: "voronoi",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for FeatureCollection of points input", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [1, 1],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.voronoi).toBeDefined();
    expect(result.outputs?.voronoi.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for FeatureCollection with bbox", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [1, 1],
            },
          },
        ],
      },
      bbox: [-1, -1, 2, 2],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.voronoi).toBeDefined();
    expect(result.outputs?.voronoi.type).toBe("FeatureCollection");
  });

  it("returns an error for missing points input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing points input");
  });

  it("returns an error for non-array bbox", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        ],
      },
      bbox: "not an array",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bbox must be an array");
  });

  it("returns an error for bbox with wrong number of elements", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        ],
      },
      bbox: [0, 0, 1],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Bbox must have exactly 4 elements [minX, minY, maxX, maxY]"
    );
  });

  it("returns an error for bbox with non-number elements", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        ],
      },
      bbox: [0, 0, 1, "not a number"],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bbox element at index 3 must be a number");
  });

  it("handles single point input", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.voronoi).toBeDefined();
    expect(result.outputs?.voronoi.type).toBe("FeatureCollection");
  });

  it("handles multiple points with simple integer coordinates", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [2, 0],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [1, 2],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.voronoi).toBeDefined();
    expect(result.outputs?.voronoi.type).toBe("FeatureCollection");
    expect(result.outputs?.voronoi.features).toHaveLength(3);
  });
});
