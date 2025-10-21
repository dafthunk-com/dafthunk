import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { AreaNode } from "./area-node";

describe("AreaNode", () => {
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

  const node = new AreaNode({
    id: "test-node",
    name: "Test Node",
    type: "area",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns a number for Polygon input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849],
            [-122.4194, 37.7849],
            [-122.4194, 37.7749],
          ],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(typeof result.outputs?.area).toBe("number");
  });

  it("returns a number for Feature input", async () => {
    const context = createMockContext({
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-122.4194, 37.7749],
              [-122.4094, 37.7749],
              [-122.4094, 37.7849],
              [-122.4194, 37.7849],
              [-122.4194, 37.7749],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(typeof result.outputs?.area).toBe("number");
  });

  it("returns a number for FeatureCollection input", async () => {
    const context = createMockContext({
      geojson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-122.4194, 37.7749],
                  [-122.4094, 37.7749],
                  [-122.4094, 37.7849],
                  [-122.4194, 37.7849],
                  [-122.4194, 37.7749],
                ],
              ],
            },
          },
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(typeof result.outputs?.area).toBe("number");
  });

  it("returns an error for missing input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing GeoJSON input");
  });

  it("returns an error for invalid input type", async () => {
    const context = createMockContext({
      geojson: { type: "Point", coordinates: [-122.4194, 37.7749] },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid GeoJSON provided");
  });

  it("returns an error for non-object input", async () => {
    const context = createMockContext({ geojson: "not an object" });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid GeoJSON provided");
  });
});
