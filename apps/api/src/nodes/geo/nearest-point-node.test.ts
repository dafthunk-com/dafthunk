import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { NearestPointNode } from "./nearest-point-node";

describe("NearestPointNode", () => {
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

  const node = new NearestPointNode({
    id: "test-node",
    name: "Test Node",
    type: "nearestPoint",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns a Feature when given valid inputs", async () => {
    const context = createMockContext({
      targetPoint: {
        type: "Point",
        coordinates: [0, 0],
      },
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: 1 },
            geometry: {
              type: "Point",
              coordinates: [1, 1],
            },
          },
          {
            type: "Feature",
            properties: { id: 2 },
            geometry: {
              type: "Point",
              coordinates: [2, 2],
            },
          },
        ],
      },
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearestPoint).toBeDefined();
    expect(result.outputs?.nearestPoint.type).toBe("Feature");
    expect(result.outputs?.nearestPoint.geometry.type).toBe("Point");
  });

  it("returns an error if targetPoint is missing", async () => {
    const context = createMockContext({
      points: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: 1 },
            geometry: {
              type: "Point",
              coordinates: [1, 1],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing targetPoint input");
  });

  it("returns an error if points is missing", async () => {
    const context = createMockContext({
      targetPoint: {
        type: "Point",
        coordinates: [0, 0],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing points input");
  });
});
