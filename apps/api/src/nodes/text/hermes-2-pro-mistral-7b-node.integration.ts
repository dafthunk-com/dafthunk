import { env } from "cloudflare:test";
import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Hermes2ProMistral7BNode } from "./hermes-2-pro-mistral-7b-node";

describe("Hermes2ProMistral7BNode", () => {
  it("should execute text generation", async () => {
    const nodeId = "hermes-2-pro-mistral-7b";
    const node = new Hermes2ProMistral7BNode({
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
    expect(result.outputs?.response.length).toBeGreaterThan(0);
  });

  it("should execute with messages input", async () => {
    const nodeId = "hermes-2-pro-mistral-7b";
    const node = new Hermes2ProMistral7BNode({
      nodeId,
    } as unknown as Node);

    const messages = JSON.stringify([
      {
        role: "user",
        content: "Hello, how are you?",
      },
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
    expect(result.outputs?.response.length).toBeGreaterThan(0);
  });
});
