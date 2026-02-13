import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { testImageData } from "../../../test/fixtures/image-fixtures";
import { PhotonCropNode } from "./photon-crop-node";

describe("PhotonCropNode", () => {
  it("should process image", async () => {
    const nodeId = "photon-crop";
    const node = new PhotonCropNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        x: 0,
        y: 0,
        width: 16,
        height: 16,
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
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should handle missing image", async () => {
    const nodeId = "photon-crop";
    const node = new PhotonCropNode({
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
    expect(result.error).toContain("Input image is missing or invalid.");
  });
});
