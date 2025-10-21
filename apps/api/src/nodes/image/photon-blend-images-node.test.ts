import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../types";
import { PhotonBlendImagesNode } from "./photon-blend-images-node";

describe("PhotonBlendImagesNode", () => {
  it("should process image", async () => {
    const nodeId = "photon-blend-images";
    const node = new PhotonBlendImagesNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        blendImage: testImageData,
        blendMode: "overlay",
        baseImage: testImageData,
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
    const nodeId = "photon-blend-images";
    const node = new PhotonBlendImagesNode({
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
    expect(result.error).toContain("Base image is missing or invalid.");
  });
});
