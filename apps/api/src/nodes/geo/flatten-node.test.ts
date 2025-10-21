import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { FlattenNode } from "./flatten-node";

describe("FlattenNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new FlattenNode({
    id: "test-node",
    name: "Test Node",
    type: "flatten",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for Point input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for MultiPoint input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for MultiLineString input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
            [
              [2, 2],
              [3, 3],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for MultiPolygon input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
            [
              [
                [2, 2],
                [3, 2],
                [3, 3],
                [2, 3],
                [2, 2],
              ],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for FeatureCollection input", async () => {
    const context = createMockContext({
      geojson: {
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
              type: "LineString",
              coordinates: [
                [1, 1],
                [2, 2],
              ],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for GeometryCollection input", async () => {
    const context = createMockContext({
      geojson: {
        type: "GeometryCollection",
        geometries: [
          {
            type: "Point",
            coordinates: [0, 0],
          },
          {
            type: "LineString",
            coordinates: [
              [1, 1],
              [2, 2],
            ],
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.flattened).toBeDefined();
    expect(result.outputs?.flattened.type).toBe("FeatureCollection");
  });

  it("returns an error for missing geojson input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing GeoJSON input");
  });
});
