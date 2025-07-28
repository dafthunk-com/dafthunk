import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { LengthNode } from "./length-node";

describe("LengthNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LengthNode({
    id: "test-node",
    name: "Test Node",
    type: "length",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("should delegate to turf.length for valid LineString", async () => {
    const context = createMockContext({
      geojson: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [10, 10],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(typeof result.outputs?.length).toBe("number");
  });

  it("should return error for missing geojson input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing GeoJSON input");
  });
});
