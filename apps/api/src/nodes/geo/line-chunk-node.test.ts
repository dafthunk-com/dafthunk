import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { LineChunkNode } from "./line-chunk-node";

describe("LineChunkNode", () => {
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

  const node = new LineChunkNode({
    id: "test-node",
    name: "Test Node",
    type: "line-chunk",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for LineString input", async () => {
    const context = createMockContext({
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
      length: 1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString with custom length", async () => {
    const context = createMockContext({
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
      length: 2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry input", async () => {
    const context = createMockContext({
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
      length: 1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString with reverse option", async () => {
    const context = createMockContext({
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
      length: 1,
      reverse: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString with reverse false", async () => {
    const context = createMockContext({
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
      length: 1,
      reverse: false,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple LineString with integer coordinates", async () => {
    const context = createMockContext({
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
      length: 2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for diagonal LineString", async () => {
    const context = createMockContext({
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
      length: 1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for short LineString", async () => {
    const context = createMockContext({
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
      length: 1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({
      length: 1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for missing length input", async () => {
    const context = createMockContext({
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
    expect(result.error).toBe("Missing length input");
  });

  it("returns an error for non-number length", async () => {
    const context = createMockContext({
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
      length: "not a number",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Length must be a number");
  });

  it("returns an error for non-positive length", async () => {
    const context = createMockContext({
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
      length: 0,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Length must be a positive number");
  });

  it("returns an error for negative length", async () => {
    const context = createMockContext({
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
      length: -1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Length must be a positive number");
  });

  it("returns an error for non-boolean reverse", async () => {
    const context = createMockContext({
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
      length: 1,
      reverse: "not a boolean",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Reverse must be a boolean");
  });

  it("handles null reverse gracefully", async () => {
    const context = createMockContext({
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
      length: 1,
      reverse: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });

  it("handles undefined reverse gracefully", async () => {
    const context = createMockContext({
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
      length: 1,
      reverse: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.chunks).toBeDefined();
    expect(result.outputs?.chunks.type).toBe("FeatureCollection");
  });
});
