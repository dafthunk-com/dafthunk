import type { NodeContext } from "@dafthunk/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { GeoJsonToSvgNode } from "./geojson-to-svg-node";

describe("GeoJsonToSvgNode", () => {
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

  let node: GeoJsonToSvgNode;

  beforeEach(() => {
    node = new GeoJsonToSvgNode({
      id: "test-node",
      name: "Test Node",
      type: "geojson-to-svg",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
  });

  it("should have correct node type definition", () => {
    expect(GeoJsonToSvgNode.nodeType.id).toBe("geojson-to-svg");
    expect(GeoJsonToSvgNode.nodeType.name).toBe("GeoJSON to SVG");
    expect(GeoJsonToSvgNode.nodeType.type).toBe("geojson-to-svg");
    expect(GeoJsonToSvgNode.nodeType.description).toContain(
      "identity projection"
    );
    expect(GeoJsonToSvgNode.nodeType.description).toContain(
      "separate path elements"
    );
  });

  it("should have correct inputs", () => {
    const inputs = GeoJsonToSvgNode.nodeType.inputs;
    expect(inputs).toHaveLength(11);

    const geojsonInput = inputs.find((i) => i.name === "geojson");
    expect(geojsonInput).toBeDefined();
    expect(geojsonInput?.type).toBe("geojson");
    expect(geojsonInput?.required).toBe(true);

    const widthInput = inputs.find((i) => i.name === "width");
    expect(widthInput).toBeDefined();
    expect(widthInput?.type).toBe("number");
    expect(widthInput?.required).toBe(false);
    expect(widthInput?.value).toBe(400);

    const heightInput = inputs.find((i) => i.name === "height");
    expect(heightInput).toBeDefined();
    expect(heightInput?.type).toBe("number");
    expect(heightInput?.required).toBe(false);
    expect(heightInput?.value).toBe(300);

    const minXInput = inputs.find((i) => i.name === "minX");
    expect(minXInput).toBeDefined();
    expect(minXInput?.type).toBe("number");
    expect(minXInput?.required).toBe(false);

    const minYInput = inputs.find((i) => i.name === "minY");
    expect(minYInput).toBeDefined();
    expect(minYInput?.type).toBe("number");
    expect(minYInput?.required).toBe(false);

    const maxXInput = inputs.find((i) => i.name === "maxX");
    expect(maxXInput).toBeDefined();
    expect(maxXInput?.type).toBe("number");
    expect(maxXInput?.required).toBe(false);

    const maxYInput = inputs.find((i) => i.name === "maxY");
    expect(maxYInput).toBeDefined();
    expect(maxYInput?.type).toBe("number");
    expect(maxYInput?.required).toBe(false);
  });

  it("should have correct outputs", () => {
    const outputs = GeoJsonToSvgNode.nodeType.outputs;
    expect(outputs).toHaveLength(1);

    const svgOutput = outputs.find((o) => o.name === "svg");
    expect(svgOutput).toBeDefined();
    expect(svgOutput?.type).toBe("image");
    expect(svgOutput?.description).toBe("SVG image rendered from GeoJSON");
  });

  it("should return error when no GeoJSON is provided", async () => {
    const result = await node.execute(createMockContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("No GeoJSON data provided");
  });

  it("should accept viewport parameters", () => {
    const inputs = GeoJsonToSvgNode.nodeType.inputs;
    const minXInput = inputs.find((i) => i.name === "minX");
    const minYInput = inputs.find((i) => i.name === "minY");
    const maxXInput = inputs.find((i) => i.name === "maxX");
    const maxYInput = inputs.find((i) => i.name === "maxY");

    expect(minXInput).toBeDefined();
    expect(minXInput?.description).toContain("Minimum X coordinate");
    expect(minXInput?.description).toContain("left boundary");

    expect(minYInput).toBeDefined();
    expect(minYInput?.description).toContain("Minimum Y coordinate");
    expect(minYInput?.description).toContain("bottom boundary");

    expect(maxXInput).toBeDefined();
    expect(maxXInput?.description).toContain("Maximum X coordinate");
    expect(maxXInput?.description).toContain("right boundary");

    expect(maxYInput).toBeDefined();
    expect(maxYInput?.description).toContain("Maximum Y coordinate");
    expect(maxYInput?.description).toContain("top boundary");
  });

  it("should handle partial viewport parameters", () => {
    const inputs = GeoJsonToSvgNode.nodeType.inputs;
    const minXInput = inputs.find((i) => i.name === "minX");
    const maxYInput = inputs.find((i) => i.name === "maxY");

    // All viewport parameters are optional
    expect(minXInput?.required).toBe(false);
    expect(maxYInput?.required).toBe(false);
  });
});
