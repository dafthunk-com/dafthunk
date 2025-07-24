import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StableDiffusionXLBase10Node } from "./stable-diffusion-xl-base-1-0-node";

describe("StableDiffusionXLBase10Node", () => {
  it("should generate an image from text prompt", async () => {
    const nodeId = "stable-diffusion-xl-base-1-0";
    const node = new StableDiffusionXLBase10Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "A simple red circle on a white background",
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

  it("should handle negative prompts", async () => {
    const nodeId = "stable-diffusion-xl-base-1-0";
    const node = new StableDiffusionXLBase10Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "A beautiful landscape",
        negative_prompt: "blurry, low quality",
        width: 256,
        height: 256,
        num_steps: 5,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });
});
