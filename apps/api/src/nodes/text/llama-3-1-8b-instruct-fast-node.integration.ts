import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { Llama318BInstructFastNode } from "./llama-3-1-8b-instruct-fast-node";

describe("Llama318BInstructFastNode", () => {
  it("should execute manually", async () => {
    const nodeId = "llama-3-1-8b-instruct-fast";
    const node = new Llama318BInstructFastNode({
      nodeId,
    } as unknown as Node);

    const prompt = "What is the capital of France?";
    const context = {
      nodeId,
      inputs: {
        prompt,
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
