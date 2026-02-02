import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { DeepseekR1DistillQwen32BNode } from "./deepseek-r1-distill-qwen-32b-node";

describe("DeepseekR1DistillQwen32BNode", () => {
  it("should execute with prompt", async () => {
    const nodeId = "deepseek-r1-distill-qwen-32b";
    const node = new DeepseekR1DistillQwen32BNode({
      nodeId,
    } as unknown as Node);

    const prompt = "What is the capital of France?";
    const context = {
      nodeId,
      inputs: {
        prompt,
        temperature: 0.7,
        max_tokens: 256,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.response).toBeDefined();
    expect(typeof result.outputs?.response).toBe("string");
  });

  it("should execute with messages", async () => {
    const nodeId = "deepseek-r1-distill-qwen-32b";
    const node = new DeepseekR1DistillQwen32BNode({
      nodeId,
    } as unknown as Node);

    const messages = JSON.stringify([
      { role: "user", content: "What is the capital of France?" },
    ]);
    const context = {
      nodeId,
      inputs: {
        messages,
        temperature: 0.7,
        max_tokens: 256,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.response).toBeDefined();
    expect(typeof result.outputs?.response).toBe("string");
  });
});
