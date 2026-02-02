import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { KinksNode } from "./kinks-node";

describe("KinksNode", () => {
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

  const node = new KinksNode({
    id: "test-node",
    name: "Test Node",
    type: "kinks",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for LineString with self-intersection", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
            [1, 1],
            [1, -1],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString without self-intersection", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon with self-intersection", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [1, 1],
              [1, -1],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon without self-intersection", async () => {
    const context = createMockContext({
      line: {
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
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
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
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry input", async () => {
    const context = createMockContext({
      line: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon geometry input", async () => {
    const context = createMockContext({
      line: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for complex self-intersecting line", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [3, 0],
            [1, 2],
            [1, -2],
            [3, 0],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple straight line", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.kinks).toBeDefined();
    expect(result.outputs?.kinks.type).toBe("FeatureCollection");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });
});
