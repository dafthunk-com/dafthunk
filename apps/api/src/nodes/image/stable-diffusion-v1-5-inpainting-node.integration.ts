import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../types";
import { StableDiffusionV15InpaintingNode } from "./stable-diffusion-v1-5-inpainting-node";

describe.skip("StableDiffusionV15InpaintingNode", () => {
  it("should perform inpainting on an image", async () => {
    const nodeId = "stable-diffusion-v1-5-inpainting";
    const node = new StableDiffusionV15InpaintingNode({
      nodeId,
    } as unknown as Node);

    // Create a simple mask (same size as test image)
    const maskData = new Uint8Array(testImageData.data.length);
    // Set some pixels as masked (for inpainting)
    for (let i = 0; i < maskData.length; i += 4) {
      maskData[i] = 255; // White pixels for masked areas
    }

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        mask: {
          data: maskData,
          mimeType: "image/png",
        },
        prompt: "Fill the masked area with a red circle",
        num_steps: 10,
        strength: 1.0,
        guidance: 7.5,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.data).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/jpeg");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });
});
