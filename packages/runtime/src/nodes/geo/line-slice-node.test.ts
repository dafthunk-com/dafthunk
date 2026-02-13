import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { LineSliceNode } from "./line-slice-node";

describe("LineSliceNode", () => {
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

  const node = new LineSliceNode({
    id: "test-node",
    name: "Test Node",
    type: "line-slice",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns LineString for basic line slice", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [3, 0],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for Point geometry inputs", async () => {
    const context = createMockContext({
      startPt: {
        type: "Point",
        coordinates: [1, 0],
      },
      stopPt: {
        type: "Point",
        coordinates: [3, 0],
      },
      line: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [4, 0],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for diagonal line slice", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 1],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [3, 3],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for simple coordinates", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [6, 0],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
            [4, 0],
            [6, 0],
            [8, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for start and stop at same point", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 0],
        },
      },
      line: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for start at beginning and stop at end", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 0],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for points not exactly on line", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1.5, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2.5, 0],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for short line", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 0],
        },
      },
      line: {
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
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns an error for missing startPt input", async () => {
    const context = createMockContext({
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [3, 0],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing startPt input");
  });

  it("returns an error for missing stopPt input", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 0],
        },
      },
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing stopPt input");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({
      startPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 0],
        },
      },
      stopPt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [3, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });
});
