import { describe, expect, it } from "vitest";
import { PolygonizeNode } from "./polygonize-node";
import { NodeContext } from "../types";

describe("PolygonizeNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new PolygonizeNode({
    id: "test-node",
    name: "Test Node",
    type: "polygonize",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for single LineString input", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for FeatureCollection of LineStrings", async () => {
    const context = createMockContext({
      lines: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
            }
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]
            }
          }
        ]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for MultiLineString input", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
            [[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]
          ]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple LineString with integer coordinates", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry input", async () => {
    const context = createMockContext({
      lines: {
        type: "LineString",
        coordinates: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for intersecting lines that form polygons", async () => {
    const context = createMockContext({
      lines: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[0, 0], [2, 0]]
            }
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[2, 0], [2, 2]]
            }
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[2, 2], [0, 2]]
            }
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[0, 2], [0, 0]]
            }
          }
        ]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for single line that doesn't form a polygon", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygons).toBeDefined();
    expect(result.outputs?.polygons.type).toBe("FeatureCollection");
  });

  it("returns an error for missing lines input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing lines input");
  });
}); 