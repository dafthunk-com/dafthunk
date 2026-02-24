import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { RecraftV4ProNode } from "./recraft-v4-pro";

describe("RecraftV4ProNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-v4-pro",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(RecraftV4ProNode.nodeType.id).toBe("recraft-v4-pro");
    expect(RecraftV4ProNode.nodeType.name).toBe(
      "Image Generation (Recraft V4 Pro)"
    );
    expect(RecraftV4ProNode.nodeType.inputs).toHaveLength(3);
    expect(RecraftV4ProNode.nodeType.inputs[0].name).toBe("prompt");
    expect(RecraftV4ProNode.nodeType.inputs[0].type).toBe("string");
    expect(RecraftV4ProNode.nodeType.inputs[0].required).toBe(true);
    expect(RecraftV4ProNode.nodeType.inputs[1].name).toBe("size");
    expect(RecraftV4ProNode.nodeType.inputs[2].name).toBe("aspect_ratio");
    expect(RecraftV4ProNode.nodeType.outputs).toHaveLength(1);
    expect(RecraftV4ProNode.nodeType.outputs[0].name).toBe("image");
    expect(RecraftV4ProNode.nodeType.outputs[0].type).toBe("image");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing prompt input", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty prompt", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for invalid prompt type", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: 123,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept valid size options", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        size: "3072x1536",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for invalid size option", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        size: "1920x1080",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept valid aspect_ratio options", async () => {
    const node = new RecraftV4ProNode({
      nodeId: "recraft-v4-pro",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        aspect_ratio: "16:9",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });
});
