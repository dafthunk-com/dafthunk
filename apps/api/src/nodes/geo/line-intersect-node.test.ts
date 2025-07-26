import { describe, expect, it } from "vitest";
import { LineIntersectNode } from "./line-intersect-node";
import { NodeContext } from "../types";

describe("LineIntersectNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LineIntersectNode({
    id: "test-node",
    name: "Test Node",
    type: "lineIntersect",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns intersection points for two linestrings", async () => {
    const context = createMockContext({
      line1: { type: "LineString", coordinates: [[0,0],[2,2]] },
      line2: { type: "LineString", coordinates: [[0,2],[2,0]] },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns empty FeatureCollection if no intersection", async () => {
    const context = createMockContext({
      line1: { type: "LineString", coordinates: [[0,0],[1,0]] },
      line2: { type: "LineString", coordinates: [[0,1],[1,1]] },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns error for missing line1", async () => {
    const context = createMockContext({ line2: { type: "LineString", coordinates: [[0,0],[1,1]] } });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/Missing line1/);
  });

  it("returns error for missing line2", async () => {
    const context = createMockContext({ line1: { type: "LineString", coordinates: [[0,0],[1,1]] } });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/Missing line2/);
  });
}); 