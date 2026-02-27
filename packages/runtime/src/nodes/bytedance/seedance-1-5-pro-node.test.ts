import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Seedance15ProNode } from "./seedance-1-5-pro-node";

describe("Seedance15ProNode", () => {
  const makeNode = () =>
    new Seedance15ProNode({ nodeId: "seedance-1-5-pro" } as unknown as Node);

  it("should have correct nodeType metadata", () => {
    expect(Seedance15ProNode.nodeType.id).toBe("seedance-1-5-pro");
    expect(Seedance15ProNode.nodeType.type).toBe("seedance-1-5-pro");
    expect(Seedance15ProNode.nodeType.outputs).toHaveLength(1);
    expect(Seedance15ProNode.nodeType.outputs[0].name).toBe("video");
  });

  it("should return error when REPLICATE_API_TOKEN is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedance-1-5-pro",
      inputs: { prompt: "a rocket launch" },
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
      nodeId: "seedance-1-5-pro",
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
      nodeId: "seedance-1-5-pro",
      inputs: { prompt: "" },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for duration out of range", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedance-1-5-pro",
      inputs: { prompt: "test", duration: 1 },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error when objectStore is missing but image is provided", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "seedance-1-5-pro",
      inputs: {
        prompt: "test",
        image: { data: new Uint8Array([1]), mimeType: "image/jpeg" },
      },
      env: { REPLICATE_API_TOKEN: "test-token" },
      objectStore: undefined,
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("ObjectStore");
  });
});
