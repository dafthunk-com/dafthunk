import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../types";
import { LLaVA157BHFNode } from "./llava1-5-7b-hf-node";

describe("LLaVA157BHFNode", () => {
  it("should describe an image", async () => {
    const nodeId = "llava1-5-7b-hf";
    const node = new LLaVA157BHFNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        prompt: "Describe this image in detail",
        max_tokens: 100,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.description).toBeDefined();
    expect(typeof result.outputs?.description).toBe("string");
    expect(result.outputs?.description.length).toBeGreaterThan(0);
  });

  it("should handle different prompts", async () => {
    const nodeId = "llava1-5-7b-hf";
    const node = new LLaVA157BHFNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        prompt: "What colors do you see in this image?",
        max_tokens: 50,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.description).toBeDefined();
    expect(typeof result.outputs?.description).toBe("string");
  });
});
