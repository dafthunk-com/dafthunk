import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { LineOverlapNode } from "./line-overlap-node";

describe("LineOverlapNode", () => {
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

  const node = new LineOverlapNode({
    id: "test-node",
    name: "Test Node",
    type: "line-overlap",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for overlapping LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
            [4, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [3, 0],
            [5, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for non-overlapping LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [2, 0],
            [3, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry inputs", async () => {
    const context = createMockContext({
      line1: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 0],
          [4, 0],
        ],
      },
      line2: {
        type: "LineString",
        coordinates: [
          [1, 0],
          [3, 0],
          [5, 0],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString and Polygon overlap", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
            [4, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, -1],
              [4, -1],
              [4, 1],
              [0, 1],
              [0, -1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon and Polygon overlap", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineStrings with tolerance", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
            [4, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0.1],
            [3, 0.1],
            [5, 0.1],
          ],
        },
      },
      tolerance: 1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple LineStrings with integer coordinates", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
            [8, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [2, 0],
            [6, 0],
            [10, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for parallel LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 1],
            [2, 1],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for collinear LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [3, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for touching LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [2, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("returns an error for missing line1 input", async () => {
    const context = createMockContext({
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line1 input");
  });

  it("returns an error for missing line2 input", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line2 input");
  });

  it("returns an error for non-number tolerance", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [3, 0],
          ],
        },
      },
      tolerance: "not a number",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Tolerance must be a number");
  });

  it("returns an error for negative tolerance", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [3, 0],
          ],
        },
      },
      tolerance: -1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Tolerance must be a non-negative number");
  });

  it("handles null tolerance gracefully", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [3, 0],
          ],
        },
      },
      tolerance: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });

  it("handles undefined tolerance gracefully", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [3, 0],
          ],
        },
      },
      tolerance: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.overlaps).toBeDefined();
    expect(result.outputs?.overlaps.type).toBe("FeatureCollection");
  });
});
