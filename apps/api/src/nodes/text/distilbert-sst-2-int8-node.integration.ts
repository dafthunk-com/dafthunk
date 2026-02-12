import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { DistilbertSst2Int8Node } from "./distilbert-sst-2-int8-node";

describe("DistilbertSst2Int8Node", () => {
  it("should execute sentiment analysis for positive text", async () => {
    const nodeId = "distilbert-sst-2-int8";
    const node = new DistilbertSst2Int8Node({
      nodeId,
    } as unknown as Node);

    const text = "I love this movie, it's amazing!";
    const context = {
      nodeId,
      inputs: {
        text,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.positive).toBeDefined();
    expect(result.outputs?.negative).toBeDefined();
    expect(typeof result.outputs?.positive).toBe("number");
    expect(typeof result.outputs?.negative).toBe("number");
    expect(result.outputs?.positive + result.outputs?.negative).toBeCloseTo(
      1,
      2
    );
  });

  it("should execute sentiment analysis for negative text", async () => {
    const nodeId = "distilbert-sst-2-int8";
    const node = new DistilbertSst2Int8Node({
      nodeId,
    } as unknown as Node);

    const text = "This movie is terrible and boring.";
    const context = {
      nodeId,
      inputs: {
        text,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.positive).toBeDefined();
    expect(result.outputs?.negative).toBeDefined();
    expect(typeof result.outputs?.positive).toBe("number");
    expect(typeof result.outputs?.negative).toBe("number");
    expect(result.outputs?.positive + result.outputs?.negative).toBeCloseTo(
      1,
      2
    );
  });
});
