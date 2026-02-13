import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { RecraftV3Node } from "./recraft-v3";

describe("RecraftV3Node", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-v3",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(RecraftV3Node.nodeType.id).toBe("recraft-v3");
    expect(RecraftV3Node.nodeType.name).toBe("Image Generation (Recraft V3)");
    expect(RecraftV3Node.nodeType.inputs).toHaveLength(5);
    expect(RecraftV3Node.nodeType.inputs[0].name).toBe("prompt");
    expect(RecraftV3Node.nodeType.inputs[0].type).toBe("string");
    expect(RecraftV3Node.nodeType.inputs[0].required).toBe(true);
    expect(RecraftV3Node.nodeType.inputs[1].name).toBe("style");
    expect(RecraftV3Node.nodeType.inputs[2].name).toBe("substyle");
    expect(RecraftV3Node.nodeType.inputs[3].name).toBe("size");
    expect(RecraftV3Node.nodeType.inputs[4].name).toBe("aspect_ratio");
    expect(RecraftV3Node.nodeType.outputs).toHaveLength(1);
    expect(RecraftV3Node.nodeType.outputs[0].name).toBe("image");
    expect(RecraftV3Node.nodeType.outputs[0].type).toBe("image");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
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
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty prompt", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
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
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
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
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
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

  it("should accept valid style options", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        style: "digital_illustration",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept valid substyle options", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        style: "digital_illustration",
        substyle: "pixel_art",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for invalid substyle option", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        substyle: "invalid_substyle",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept valid size options", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A beautiful landscape",
        size: "1536x1024",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for invalid size option", async () => {
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
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
    const node = new RecraftV3Node({
      nodeId: "recraft-v3",
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
