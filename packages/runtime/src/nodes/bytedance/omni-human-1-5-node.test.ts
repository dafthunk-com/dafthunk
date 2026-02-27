import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { OmniHuman15Node } from "./omni-human-1-5-node";

describe("OmniHuman15Node", () => {
  const makeNode = () =>
    new OmniHuman15Node({ nodeId: "omni-human-1-5" } as unknown as Node);

  it("should have correct nodeType metadata", () => {
    expect(OmniHuman15Node.nodeType.id).toBe("omni-human-1-5");
    expect(OmniHuman15Node.nodeType.type).toBe("omni-human-1-5");
    expect(OmniHuman15Node.nodeType.outputs).toHaveLength(1);
    expect(OmniHuman15Node.nodeType.outputs[0].name).toBe("video");
  });

  it("should return error when REPLICATE_API_TOKEN is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "omni-human-1-5",
      inputs: {
        image: { data: new Uint8Array([1]), mimeType: "image/jpeg" },
        audio: { data: new Uint8Array([1]), mimeType: "audio/wav" },
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
      nodeId: "omni-human-1-5",
      inputs: {
        image: { data: new Uint8Array([1]), mimeType: "image/jpeg" },
        audio: { data: new Uint8Array([1]), mimeType: "audio/wav" },
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
      nodeId: "omni-human-1-5",
      inputs: {
        audio: { data: new Uint8Array([1]), mimeType: "audio/wav" },
      },
      env: { REPLICATE_API_TOKEN: "test-token" },
      sleep: async () => {},
      doStep: async (fn) => fn(),
    } as never);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error when audio is missing", async () => {
    const node = makeNode();
    const result = await node.execute({
      nodeId: "omni-human-1-5",
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
