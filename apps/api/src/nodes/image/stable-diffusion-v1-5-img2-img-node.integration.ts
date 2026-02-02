import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../../runtime/node-types";
import { StableDiffusionV15Img2ImgNode } from "./stable-diffusion-v1-5-img2-img-node";

describe("StableDiffusionV15Img2ImgNode", () => {
  it("should transform an image using img2img", async () => {
    const nodeId = "stable-diffusion-v1-5-img2img";
    const node = new StableDiffusionV15Img2ImgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        prompt: "Make this image more vibrant",
        strength: 0.5,
        guidance: 7.5,
        num_steps: 10,
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
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });
});
