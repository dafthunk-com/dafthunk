import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "../../runtime/node-types";
import { RecraftV3SvgNode } from "./recraft-v3-svg";

describe("RecraftV3SvgNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-v3-svg",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(RecraftV3SvgNode.nodeType.id).toBe("recraft-v3-svg");
    expect(RecraftV3SvgNode.nodeType.name).toBe("Text to SVG (Recraft V3)");
    expect(RecraftV3SvgNode.nodeType.inputs).toHaveLength(4);
    expect(RecraftV3SvgNode.nodeType.inputs[0].name).toBe("prompt");
    expect(RecraftV3SvgNode.nodeType.inputs[0].type).toBe("string");
    expect(RecraftV3SvgNode.nodeType.inputs[0].required).toBe(true);
    expect(RecraftV3SvgNode.nodeType.inputs[1].name).toBe("style");
    expect(RecraftV3SvgNode.nodeType.inputs[2].name).toBe("size");
    expect(RecraftV3SvgNode.nodeType.inputs[3].name).toBe("aspect_ratio");
    expect(RecraftV3SvgNode.nodeType.outputs).toHaveLength(1);
    expect(RecraftV3SvgNode.nodeType.outputs[0].name).toBe("svg");
    expect(RecraftV3SvgNode.nodeType.outputs[0].type).toBe("blob");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing prompt input", async () => {
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty prompt", async () => {
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
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
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
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
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
        style: "invalid_style",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept valid style options", async () => {
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
    } as unknown as Node);

    // Test with line_art style - should fail due to missing API token, not validation
    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
        style: "line_art",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept valid size options", async () => {
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
        size: "1920x1080",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept valid aspect_ratio options", async () => {
    const node = new RecraftV3SvgNode({
      nodeId: "recraft-v3-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
        aspect_ratio: "16:9",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });
});
