import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { DreamActorM20Node } from "./dreamactor-m2-0-node";

describe("DreamActorM20Node", () => {
  const makeNode = () =>
    new DreamActorM20Node({ nodeId: "dreamactor-m2-0" } as unknown as Node);

  it("should have correct nodeType metadata", () => {
    expect(DreamActorM20Node.nodeType.id).toBe("dreamactor-m2-0");
    expect(DreamActorM20Node.nodeType.type).toBe("dreamactor-m2-0");
    expect(DreamActorM20Node.nodeType.outputs).toHaveLength(1);
    expect(DreamActorM20Node.nodeType.outputs[0].name).toBe("video");
  });

  it("should return error when REPLICATE_API_TOKEN is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "dreamactor-m2-0",
      inputs: {
        image: { data: new Uint8Array([1]), mimeType: "image/jpeg" },
        video: { data: new Uint8Array([1]), mimeType: "video/mp4" },
      },
      env: {},
      objectStore: {},
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error when objectStore is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "dreamactor-m2-0",
      inputs: {
        image: { data: new Uint8Array([1]), mimeType: "image/jpeg" },
        video: { data: new Uint8Array([1]), mimeType: "video/mp4" },
      },
      env: { REPLICATE_API_TOKEN: "test-token" },
      objectStore: undefined,
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("ObjectStore");
  });

  it("should return error when image is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "dreamactor-m2-0",
      inputs: {
        video: { data: new Uint8Array([1]), mimeType: "video/mp4" },
      },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error when video is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "dreamactor-m2-0",
      inputs: {
        image: { data: new Uint8Array([1]), mimeType: "image/jpeg" },
      },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
