import { env } from "cloudflare:test";
import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { testImageData } from "../../../test/fixtures/image-fixtures";
import { UformGen2Qwen500mNode } from "./uform-gen2-qwen-500m-node";

describe("UformGen2Qwen500mNode", () => {
  it("should generate a caption for an image", async () => {
    const nodeId = "uform-gen2-qwen-500m";
    const node = new UformGen2Qwen500mNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        prompt: "Generate a caption for this image",
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
    const nodeId = "uform-gen2-qwen-500m";
    const node = new UformGen2Qwen500mNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
        prompt: "What is the main subject of this image?",
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
