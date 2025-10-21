import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanPointInPolygonNode } from "./boolean-point-in-polygon-node";

describe("BooleanPointInPolygonNode", () => {
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

  const node = new BooleanPointInPolygonNode({
    id: "test-node",
    name: "Test Node",
    type: "booleanPointInPolygon",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  const testPolygon = {
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
  };

  it("returns true for point inside polygon", async () => {
    const context = createMockContext({
      point: { type: "Point", coordinates: [0.5, 0.5] },
      polygon: testPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.inside).toBe(true);
  });

  it("returns false for point outside polygon", async () => {
    const context = createMockContext({
      point: { type: "Point", coordinates: [-1, -1] },
      polygon: testPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(typeof result.outputs?.inside).toBe("boolean");
  });

  it("passes ignoreBoundary option to turf", async () => {
    const context = createMockContext({
      point: { type: "Point", coordinates: [0, 0.5] },
      polygon: testPolygon,
      ignoreBoundary: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(typeof result.outputs?.inside).toBe("boolean");
  });

  it("returns error if point is missing", async () => {
    const context = createMockContext({ polygon: testPolygon });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
  });

  it("returns error if polygon is missing", async () => {
    const context = createMockContext({
      point: { type: "Point", coordinates: [0.5, 0.5] },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
  });
});
