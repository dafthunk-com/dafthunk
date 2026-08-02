import { env } from "cloudflare:test";
import { CloudflareModelNode } from "@dafthunk/runtime/nodes/cloudflare/cloudflare-model-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { imageDescriptionTemplate } from "./image-description";

/**
 * A 4x4 solid red PNG. Small enough to keep the test fast, real enough for the
 * vision model to return a description rather than an error.
 */
const RED_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4nGP8z8Dwn4GKgImaho0" +
      "GCAMAHm0BB1DfW4YAAAAASUVORK5CYII="
  ),
  (c) => c.charCodeAt(0)
);

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
    expect(imageDescriptionTemplate.tags).toContain("image");
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
    expect(describerNode?.type).toBe("cloudflare-model");

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

  it("should pin a model that is still served by Workers AI", () => {
    const describerNode = imageDescriptionTemplate.nodes.find(
      (n) => n.id === "image-describer"
    )!;
    const modelInput = describerNode.inputs.find((i) => i.name === "model");
    // Retired 2026-05-30 in the same batch as bart-large-cnn.
    expect(modelInput?.value).not.toBe("@cf/unum/uform-gen2-qwen-500m");
  });

  it("should execute the describer and output nodes", async () => {
    const describerNode = imageDescriptionTemplate.nodes.find(
      (n) => n.id === "image-describer"
    )!;
    const describerResult = await new CloudflareModelNode(
      describerNode
    ).execute({
      nodeId: describerNode.id,
      inputs: {
        model: describerNode.inputs.find((i) => i.name === "model")?.value,
        image: { data: RED_PNG, mimeType: "image/png" },
        prompt: "Generate a caption for this image",
        max_tokens: 512,
      },
      env: env as Bindings,
    } as any);
    expect(describerResult.status, String(describerResult.error)).toBe(
      "completed"
    );
    expect(typeof describerResult.outputs?.description).toBe("string");
    expect(
      (describerResult.outputs?.description as string).length
    ).toBeGreaterThan(0);

    const outputNode = imageDescriptionTemplate.nodes.find(
      (n) => n.id === "description-preview"
    )!;
    const outputResult = await new TextOutputNode(outputNode).execute({
      nodeId: outputNode.id,
      inputs: { value: describerResult.outputs?.description },
      env: env as Bindings,
    } as any);
    expect(outputResult.status, String(outputResult.error)).toBe("completed");
    expect(outputResult.outputs?.displayValue).toBeDefined();
  });
});
