import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { GeoTiffTransformNode } from "./geotiff-transform-node";

describe("GeoTiffTransformNode", () => {
  const nodeId = "geotiff-transform";
  const node = new GeoTiffTransformNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const metadata = {
    width: 256,
    height: 256,
    bounds: [0, 0, 0, 0],
    crs: "EPSG:4326",
  };

  it("reprojects WGS84 bounds to Web Mercator", async () => {
    const result = await node.execute(
      createContext({ metadata: { ...metadata, bounds: [0, 0, 180, 0] } })
    );

    expect(result.status).toBe("completed");
    const transformed = result.outputs?.transformed as {
      bounds: number[];
      crs: string;
    };
    expect(transformed.crs).toBe("EPSG:3857");
    expect(transformed.bounds[0]).toBeCloseTo(0, 6);
    // 180° east is the eastern edge of the Web Mercator square.
    expect(transformed.bounds[2]).toBeCloseTo(20037508.34, 1);
  });

  it("maps the equator to y = 0", async () => {
    const result = await node.execute(
      createContext({ metadata: { ...metadata, bounds: [-10, 0, 10, 0] } })
    );

    const transformed = result.outputs?.transformed as { bounds: number[] };
    expect(transformed.bounds[1]).toBeCloseTo(0, 6);
    expect(transformed.bounds[3]).toBeCloseTo(0, 6);
  });

  it("keeps the other metadata fields", async () => {
    const result = await node.execute(createContext({ metadata }));

    expect(result.outputs?.transformed).toMatchObject({
      width: 256,
      height: 256,
    });
  });

  it("refuses to transform metadata already in another CRS", async () => {
    const result = await node.execute(
      createContext({ metadata: { ...metadata, crs: "EPSG:3857" } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("expected EPSG:4326");
  });

  it("reports missing metadata against this node", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to transform GeoTIFF metadata");
  });
});
