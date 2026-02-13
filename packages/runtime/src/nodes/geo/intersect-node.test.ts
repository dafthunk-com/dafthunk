import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { IntersectNode } from "./intersect-node";

describe("IntersectNode", () => {
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

  const node = new IntersectNode({
    id: "test-node",
    name: "Test Node",
    type: "intersect",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  const polygon1 = {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ],
    ],
  };

  const polygon2 = {
    type: "Polygon",
    coordinates: [
      [
        [5, 5],
        [5, 15],
        [15, 15],
        [15, 5],
        [5, 5],
      ],
    ],
  };

  it("returns intersection for valid polygons", async () => {
    const context = createMockContext({ polygon1, polygon2 });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersection).not.toBeUndefined();
  });

  it("passes properties to the result", async () => {
    const properties = { foo: "bar" };
    const context = createMockContext({ polygon1, polygon2, properties });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    if (result.outputs?.intersection) {
      expect(result.outputs.intersection.properties.foo).toBe("bar");
    }
  });

  it("returns error if polygon1 is missing", async () => {
    const context = createMockContext({ polygon2 });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon1 input");
  });

  it("returns error if polygon2 is missing", async () => {
    const context = createMockContext({ polygon1 });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon2 input");
  });

  it("returns error if properties is not an object", async () => {
    const context = createMockContext({
      polygon1,
      polygon2,
      properties: "not an object",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
  });
});
