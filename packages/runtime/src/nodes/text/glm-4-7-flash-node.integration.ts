import { env } from "cloudflare:test";
import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Glm47FlashNode } from "./glm-4-7-flash-node";

describe("Glm47FlashNode", () => {
  it("should execute manually", async () => {
    const nodeId = "glm-4-7-flash";
    const node = new Glm47FlashNode({
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
