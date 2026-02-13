import { env } from "cloudflare:test";
import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { GptOss20BNode } from "./gpt-oss-20b-node";

describe("GptOss20BNode", () => {
  it("should execute manually", async () => {
    const nodeId = "gpt-oss-20b";
    const node = new GptOss20BNode({
      nodeId,
    } as unknown as Node);

    const input = "What is the capital of France?";
    const context = {
      nodeId,
      inputs: {
        input,
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

  it("should execute with custom instructions", async () => {
    const nodeId = "gpt-oss-20b";
    const node = new GptOss20BNode({
      nodeId,
    } as unknown as Node);

    const input = "What is the capital of France?";
    const instructions = "You are a concise assistant. Provide brief answers.";
    const context = {
      nodeId,
      inputs: {
        input,
        instructions,
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
