import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../types";
import { PhotonGrayscaleNode } from "./photon-grayscale-node";

describe("PhotonGrayscaleNode", () => {
  it("should process image", async () => {
    const nodeId = "photon-grayscale";
    const node = new PhotonGrayscaleNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
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
    const nodeId = "photon-grayscale";
    const node = new PhotonGrayscaleNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Input image is missing or invalid.");
  });
});
