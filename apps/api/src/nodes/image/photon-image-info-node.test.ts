import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../types";
import { PhotonImageInfoNode } from "./photon-image-info-node";

describe("PhotonImageInfoNode", () => {
  it("should process image", async () => {
    const nodeId = "photon-image-info";
    const node = new PhotonImageInfoNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.imagePassthrough).toBeDefined();
    expect(result.outputs?.imagePassthrough.data).toBeDefined();
    expect(result.outputs?.imagePassthrough.mimeType).toBe("image/png");
    expect(result.outputs?.imagePassthrough.data.length).toBeGreaterThan(0);
  });

  it("should handle missing image", async () => {
    const nodeId = "photon-image-info";
    const node = new PhotonImageInfoNode({
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
