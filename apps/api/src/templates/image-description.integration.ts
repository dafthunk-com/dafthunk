import { describe, expect, it } from "vitest";

import { imageDescriptionTemplate } from "./image-description";

describe("Image Description Template", () => {
  it("should have valid structure", () => {
    expect(imageDescriptionTemplate.nodes).toHaveLength(3);
    expect(imageDescriptionTemplate.edges).toHaveLength(2);

    const nodeIds = new Set(imageDescriptionTemplate.nodes.map((n) => n.id));
    for (const edge of imageDescriptionTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(imageDescriptionTemplate.id).toBe("image-description");
    expect(imageDescriptionTemplate.name).toBe("Image Description");
    expect(imageDescriptionTemplate.trigger).toBe("manual");
    expect(imageDescriptionTemplate.tags).toContain("canvas");
    expect(imageDescriptionTemplate.tags).toContain("ai");
  });

  it("should have correct node configuration", () => {
    const canvasNode = imageDescriptionTemplate.nodes.find(
      (n) => n.id === "canvas-drawing"
    );
    expect(canvasNode).toBeDefined();
    expect(canvasNode?.type).toBe("canvas-input");

    const describerNode = imageDescriptionTemplate.nodes.find(
      (n) => n.id === "image-describer"
    );
    expect(describerNode).toBeDefined();
    expect(describerNode?.type).toBe("uform-gen2-qwen-500m");

    const previewNode = imageDescriptionTemplate.nodes.find(
      (n) => n.id === "description-preview"
    );
    expect(previewNode).toBeDefined();
    expect(previewNode?.type).toBe("output-text");
  });

  it("should have correct edge connections", () => {
    const edges = imageDescriptionTemplate.edges;

    const canvasToDescriber = edges.find(
      (e) => e.source === "canvas-drawing" && e.target === "image-describer"
    );
    expect(canvasToDescriber).toBeDefined();
    expect(canvasToDescriber?.sourceOutput).toBe("image");
    expect(canvasToDescriber?.targetInput).toBe("image");

    const describerToPreview = edges.find(
      (e) =>
        e.source === "image-describer" && e.target === "description-preview"
    );
    expect(describerToPreview).toBeDefined();
    expect(describerToPreview?.sourceOutput).toBe("description");
    expect(describerToPreview?.targetInput).toBe("value");
  });
});
