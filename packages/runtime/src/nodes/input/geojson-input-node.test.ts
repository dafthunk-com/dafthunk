import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { GeoJSONInputNode } from "./geojson-input-node";

describe("GeoJSONInputNode", () => {
  const nodeId = "geojson-input";
  const node = new GeoJSONInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("passes a geometry through", async () => {
    const value = { type: "Point", coordinates: [1, 2] };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(value);
  });

  it("passes a feature collection through", async () => {
    const value = { type: "FeatureCollection", features: [] };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(value);
  });

  it("errors when no value is provided", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No GeoJSON data provided");
  });

  it("errors when the value is null", async () => {
    const result = await node.execute(createContext({ value: null }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No GeoJSON data provided");
  });
});
