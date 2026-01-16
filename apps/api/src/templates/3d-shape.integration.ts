import { describe, expect, it } from "vitest";

import { shape3dTemplate } from "./3d-shape";

describe("3D Shape Template", () => {
  it("should have valid structure", () => {
    expect(shape3dTemplate.nodes).toHaveLength(5);
    expect(shape3dTemplate.edges).toHaveLength(4);

    const nodeIds = new Set(shape3dTemplate.nodes.map((n) => n.id));
    for (const edge of shape3dTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct node types defined", () => {
    const nodeTypes = shape3dTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("csg-cube");
    expect(nodeTypes).toContain("csg-sphere");
    expect(nodeTypes).toContain("csg-difference");
    expect(nodeTypes).toContain("csg-apply-material");
    expect(nodeTypes).toContain("output-gltf");
  });

  it("should have correct edge connections", () => {
    const edges = shape3dTemplate.edges;

    // cube -> difference (meshA)
    expect(edges).toContainEqual({
      source: "cube",
      target: "difference",
      sourceOutput: "mesh",
      targetInput: "meshA",
    });

    // sphere -> difference (meshB)
    expect(edges).toContainEqual({
      source: "sphere",
      target: "difference",
      sourceOutput: "mesh",
      targetInput: "meshB",
    });

    // difference -> apply-material
    expect(edges).toContainEqual({
      source: "difference",
      target: "apply-material",
      sourceOutput: "mesh",
      targetInput: "mesh",
    });

    // apply-material -> preview
    expect(edges).toContainEqual({
      source: "apply-material",
      target: "preview",
      sourceOutput: "mesh",
      targetInput: "value",
    });
  });

  it("should be a manual workflow", () => {
    expect(shape3dTemplate.trigger).toBe("manual");
  });
});
