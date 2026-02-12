import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "@dafthunk/runtime";
import { Recraft20bNode } from "./recraft-20b";

describe("Recraft20bNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-20b",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(Recraft20bNode.nodeType.id).toBe("recraft-20b");
    expect(Recraft20bNode.nodeType.name).toBe("Image Generation (Recraft 20B)");
    expect(Recraft20bNode.nodeType.inputs).toHaveLength(4);
    expect(Recraft20bNode.nodeType.inputs[0].name).toBe("prompt");
    expect(Recraft20bNode.nodeType.inputs[0].type).toBe("string");
    expect(Recraft20bNode.nodeType.inputs[0].required).toBe(true);
    expect(Recraft20bNode.nodeType.inputs[1].name).toBe("style");
    expect(Recraft20bNode.nodeType.inputs[1].value).toBe("realistic_image");
    expect(Recraft20bNode.nodeType.inputs[2].name).toBe("size");
    expect(Recraft20bNode.nodeType.inputs[3].name).toBe("aspect_ratio");
    expect(Recraft20bNode.nodeType.outputs).toHaveLength(1);
    expect(Recraft20bNode.nodeType.outputs[0].name).toBe("image");
    expect(Recraft20bNode.nodeType.outputs[0].type).toBe("image");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
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
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty prompt", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
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
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: 123,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for invalid style option", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        style: "invalid_style",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept realistic_image style", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        style: "realistic_image",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept digital_illustration style", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A cartoon character",
        style: "digital_illustration",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept realistic_image substyle", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        style: "realistic_image/hdr",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept digital_illustration substyle", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A retro game character",
        style: "digital_illustration/pixel_art",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept valid aspect_ratio options", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
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

  it("should return error for invalid size option", async () => {
    const node = new Recraft20bNode({
      nodeId: "recraft-20b",
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
});
