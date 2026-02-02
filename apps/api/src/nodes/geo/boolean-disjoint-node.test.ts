import { beforeEach, describe, expect, it, vi } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { BooleanDisjointNode } from "./boolean-disjoint-node";

// Mock the Turf.js booleanDisjoint function
vi.mock("@turf/turf", () => ({
  booleanDisjoint: vi.fn(),
}));

import { booleanDisjoint } from "@turf/turf";

describe("BooleanDisjointNode", () => {
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

  const node = new BooleanDisjointNode({
    id: "test-node",
    name: "Test Node",
    type: "booleanDisjoint",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to Turf.js booleanDisjoint function", async () => {
    const mockFeature1 = { type: "Point", coordinates: [0, 0] };
    const mockFeature2 = { type: "Point", coordinates: [1, 1] };
    const mockResult = true;

    vi.mocked(booleanDisjoint).mockReturnValue(mockResult);

    const context = createMockContext({
      feature1: mockFeature1,
      feature2: mockFeature2,
    });

    const result = await node.execute(context);

    expect(booleanDisjoint).toHaveBeenCalledWith(mockFeature1, mockFeature2);
    expect(result.status).toBe("completed");
    expect(result.outputs?.disjoint).toBe(mockResult);
  });

  it("returns error for missing feature1", async () => {
    const context = createMockContext({
      feature2: { type: "Point", coordinates: [0, 0] },
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toMatch(
      /Both feature1 and feature2 inputs are required/
    );
    expect(booleanDisjoint).not.toHaveBeenCalled();
  });

  it("returns error for missing feature2", async () => {
    const context = createMockContext({
      feature1: { type: "Point", coordinates: [0, 0] },
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toMatch(
      /Both feature1 and feature2 inputs are required/
    );
    expect(booleanDisjoint).not.toHaveBeenCalled();
  });

  it("returns error for missing both inputs", async () => {
    const context = createMockContext({});

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toMatch(
      /Both feature1 and feature2 inputs are required/
    );
    expect(booleanDisjoint).not.toHaveBeenCalled();
  });

  it("handles Turf.js errors gracefully", async () => {
    const mockError = new Error("Turf.js error");
    vi.mocked(booleanDisjoint).mockImplementation(() => {
      throw mockError;
    });

    const context = createMockContext({
      feature1: { type: "Point", coordinates: [0, 0] },
      feature2: { type: "Point", coordinates: [1, 1] },
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toMatch(
      /Error testing disjoint relationship: Turf\.js error/
    );
  });

  it("returns correct output format", async () => {
    vi.mocked(booleanDisjoint).mockReturnValue(false);

    const context = createMockContext({
      feature1: { type: "Point", coordinates: [0, 0] },
      feature2: { type: "Point", coordinates: [0, 0] },
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({ disjoint: false });
  });
});
