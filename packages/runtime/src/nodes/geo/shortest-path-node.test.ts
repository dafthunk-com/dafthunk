import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { ShortestPathNode } from "./shortest-path-node";

describe("ShortestPathNode", () => {
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

  const node = new ShortestPathNode({
    id: "test-node",
    name: "Test Node",
    type: "shortest-path",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns LineString for basic shortest path operation", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString for Point geometry inputs", async () => {
    const context = createMockContext({
      start: {
        type: "Point",
        coordinates: [0, 0],
      },
      end: {
        type: "Point",
        coordinates: [4, 0],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with obstacles", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      obstacles: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [1, -1],
                  [3, -1],
                  [3, 1],
                  [1, 1],
                  [1, -1],
                ],
              ],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with custom units", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: "miles",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with degrees units", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: "degrees",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with radians units", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: "radians",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with kilometers units", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: "kilometers",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with custom resolution", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      resolution: 50,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString for simple coordinates", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [8, 8],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString for diagonal path", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 4],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString for short path", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns LineString with multiple obstacles", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [8, 0],
        },
      },
      obstacles: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [2, -1],
                  [4, -1],
                  [4, 1],
                  [2, 1],
                  [2, -1],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [5, -1],
                  [7, -1],
                  [7, 1],
                  [5, 1],
                  [5, -1],
                ],
              ],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("handles null obstacles gracefully", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      obstacles: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("handles undefined obstacles gracefully", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      obstacles: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("handles null units gracefully", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("handles undefined units gracefully", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("handles null resolution gracefully", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      resolution: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("handles undefined resolution gracefully", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      resolution: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.path).toBeDefined();
    expect(result.outputs?.path.type).toBe("Feature");
    expect(result.outputs?.path.geometry.type).toBe("LineString");
  });

  it("returns an error for missing start input", async () => {
    const context = createMockContext({
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing start input");
  });

  it("returns an error for missing end input", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing end input");
  });

  it("returns an error for non-string units", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: 123,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Units must be a string");
  });

  it("returns an error for invalid units", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      units: "invalid",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Units must be one of: degrees, radians, miles, kilometers"
    );
  });

  it("returns an error for non-number resolution", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      resolution: "not a number",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Resolution must be a number");
  });

  it("returns an error for non-positive resolution", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      resolution: 0,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Resolution must be a positive number");
  });

  it("returns an error for negative resolution", async () => {
    const context = createMockContext({
      start: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      end: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      resolution: -1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Resolution must be a positive number");
  });
});
