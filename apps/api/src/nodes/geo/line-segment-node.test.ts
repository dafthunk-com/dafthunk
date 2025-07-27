import { describe, expect, it } from "vitest";
import { LineSegmentNode } from "./line-segment-node";
import { NodeContext } from "../types";

describe("LineSegmentNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LineSegmentNode({
    id: "test-node",
    name: "Test Node",
    type: "line-segment",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for LineString input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry input", async () => {
    const context = createMockContext({
      geojson: {
        type: "LineString",
        coordinates: [[0, 0], [1, 0], [2, 0], [3, 0]]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon geometry input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Polygon",
        coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for MultiLineString input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]]
          ]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for MultiPolygon input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
            [[[3, 3], [5, 3], [5, 5], [3, 5], [3, 3]]]
          ]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple LineString with integer coordinates", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 0], [8, 0], [12, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple Polygon with integer coordinates", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for diagonal LineString", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1], [2, 2], [3, 3]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for short LineString", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon with hole", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
            [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]
          ]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.segments).toBeDefined();
    expect(result.outputs?.segments.type).toBe("FeatureCollection");
  });

  it("returns an error for missing geojson input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geojson input");
  });
}); 