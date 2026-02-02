import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { StableDiffusionXLLightningNode } from "./stable-diffusion-xl-lightning-node";

describe("StableDiffusionXLLightningNode", () => {
  it("should generate an image from text prompt", async () => {
    const nodeId = "stable-diffusion-xl-lightning";
    const node = new StableDiffusionXLLightningNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "A simple blue square",
        width: 512,
        height: 512,
        num_steps: 10,
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
