import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Seedream45Node } from "./seedream-4-5-node";

describe("Seedream45Node", () => {
  const makeNode = () =>
    new Seedream45Node({ nodeId: "seedream-4-5" } as unknown as Node);

  it("should have correct nodeType metadata", () => {
    expect(Seedream45Node.nodeType.id).toBe("seedream-4-5");
    expect(Seedream45Node.nodeType.type).toBe("seedream-4-5");
    expect(Seedream45Node.nodeType.outputs).toHaveLength(1);
    expect(Seedream45Node.nodeType.outputs[0].name).toBe("image");
  });

  it("should return error when REPLICATE_API_TOKEN is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedream-4-5",
      inputs: { prompt: "a sunset" },
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
      nodeId: "seedream-4-5",
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
      nodeId: "seedream-4-5",
      inputs: { prompt: "" },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for width out of range when size is custom", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedream-4-5",
      inputs: { prompt: "test", size: "custom", width: 512, height: 2048 },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
