import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { testImageData } from "../../../test/fixtures/image-fixtures";
import { CanvasInputNode } from "./canvas-input-node";

describe("CanvasInputNode", () => {
  it("should return the input image", async () => {
    const nodeId = "canvas-doodle";
    const node = new CanvasInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: testImageData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.data).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data).toEqual(testImageData.data);
  });

  it("should handle missing image data", async () => {
    const nodeId = "canvas-doodle";
    const node = new CanvasInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No image data provided");
  });
});
