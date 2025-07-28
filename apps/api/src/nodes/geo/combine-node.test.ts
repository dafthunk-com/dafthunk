import { combine } from "@turf/turf";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CombineNode } from "./combine-node";

describe("CombineNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new CombineNode({
    id: "test-node",
    name: "Test Node",
    type: "combine",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns error if featureCollection input is missing", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing FeatureCollection input");
  });

  it("delegates to turf.combine and returns its output", async () => {
    const featureCollection: any = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1 },
          geometry: {
            type: "Point",
            coordinates: [-122.4194, 37.7749],
          },
        },
        {
          type: "Feature",
          properties: { id: 2 },
          geometry: {
            type: "Point",
            coordinates: [-122.4094, 37.7849],
          },
        },
      ],
    };
    const context = createMockContext({ featureCollection });
    const expected = combine(featureCollection);
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.combined).toEqual(expected);
  });
});
