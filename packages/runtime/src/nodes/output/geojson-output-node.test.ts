import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { GeoJSONOutputNode } from "./geojson-output-node";

describe("GeoJSONOutputNode", () => {
  const nodeId = "output-geojson";
  const node = new GeoJSONOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays a Feature", async () => {
    const value = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1, 2] },
      properties: {},
    };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(value);
  });

  it("displays a FeatureCollection", async () => {
    const value = { type: "FeatureCollection", features: [] };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(value);
  });

  it("accepts an absent value", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBeUndefined();
  });

  it("errors on a non-object value", async () => {
    const result = await node.execute(createContext({ value: "Point" }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be a valid GeoJSON object");
  });

  it("errors on an unrecognised type", async () => {
    const result = await node.execute(
      createContext({ value: { type: "Polygon", coordinates: [] } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Value must be a valid GeoJSON with type: Geometry, Feature, or FeatureCollection"
    );
  });
});
