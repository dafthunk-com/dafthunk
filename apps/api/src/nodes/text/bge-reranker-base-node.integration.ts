import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { BgeRerankerBaseNode } from "./bge-reranker-base-node";

describe("BgeRerankerBaseNode", () => {
  it("should execute reranking", async () => {
    const nodeId = "bge-reranker-base";
    const node = new BgeRerankerBaseNode({
      nodeId,
    } as unknown as Node);

    const query = "What is the capital of France?";
    const contexts = [
      "Paris is the capital of France.",
      "London is the capital of England.",
      "Berlin is the capital of Germany.",
      "Madrid is the capital of Spain.",
    ];
    const context = {
      nodeId,
      inputs: {
        query,
        contexts,
        topK: 2,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.rankings).toBeDefined();
    expect(Array.isArray(result.outputs?.rankings)).toBe(true);
    expect(result.outputs?.rankings.length).toBeLessThanOrEqual(2);

    // Check that rankings have the expected structure
    if (result.outputs?.rankings && result.outputs.rankings.length > 0) {
      const firstRanking = result.outputs.rankings[0];
      expect(firstRanking).toHaveProperty("id");
      expect(firstRanking).toHaveProperty("score");
      expect(firstRanking).toHaveProperty("text");
      expect(typeof firstRanking.score).toBe("number");
      expect(typeof firstRanking.text).toBe("string");
    }
  });
});
