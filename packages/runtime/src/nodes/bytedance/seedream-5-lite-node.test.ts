import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Seedream5LiteNode } from "./seedream-5-lite-node";

describe("Seedream5LiteNode", () => {
  const makeNode = () =>
    new Seedream5LiteNode({ nodeId: "seedream-5-lite" } as unknown as Node);

  it("should have correct nodeType metadata", () => {
    expect(Seedream5LiteNode.nodeType.id).toBe("seedream-5-lite");
    expect(Seedream5LiteNode.nodeType.type).toBe("seedream-5-lite");
    expect(Seedream5LiteNode.nodeType.outputs).toHaveLength(1);
    expect(Seedream5LiteNode.nodeType.outputs[0].name).toBe("image");
  });

  it("should return error when REPLICATE_API_TOKEN is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedream-5-lite",
      inputs: { prompt: "a cat" },
      env: {},
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing prompt", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedream-5-lite",
      inputs: {},
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty prompt", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedream-5-lite",
      inputs: { prompt: "" },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
