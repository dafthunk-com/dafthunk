import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { ConvexNode } from "./convex-node";

describe("ConvexNode", () => {
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

  const node = new ConvexNode({
    id: "test-node",
    name: "Test Node",
    type: "convex",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns a result for valid FeatureCollection of points", async () => {
    const context = createMockContext({
      geojson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [0, 0] },
          },
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [1, 0] },
          },
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [0, 1] },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect("convexHull" in (result.outputs ?? {})).toBe(true);
  });

  it("returns error if geojson is missing", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing GeoJSON input");
  });

  it("returns error if properties is not an object", async () => {
    const context = createMockContext({
      geojson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [0, 0] },
          },
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [1, 0] },
          },
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [0, 1] },
          },
        ],
      },
      properties: "not an object",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Properties must be an object");
  });
});
