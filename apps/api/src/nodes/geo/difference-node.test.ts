import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { DifferenceNode } from "./difference-node";

describe("DifferenceNode", () => {
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

  const node = new DifferenceNode({
    id: "test-node",
    name: "Test Node",
    type: "difference",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns a result for valid input", async () => {
    const context = createMockContext({
      featureCollection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [0, 2],
                  [2, 2],
                  [2, 0],
                  [0, 0],
                ],
              ],
            },
            properties: {},
          },
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [1, 1],
                  [1, 3],
                  [3, 3],
                  [3, 1],
                  [1, 1],
                ],
              ],
            },
            properties: {},
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toHaveProperty("difference");
  });

  it("returns error for missing featureCollection", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/featureCollection/);
  });

  it("returns error for invalid featureCollection type", async () => {
    const context = createMockContext({ featureCollection: 123 });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/featureCollection/);
  });

  it("returns error for FeatureCollection with wrong number of features", async () => {
    const context = createMockContext({
      featureCollection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ],
              ],
            },
            properties: {},
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/featureCollection/);
  });
});
