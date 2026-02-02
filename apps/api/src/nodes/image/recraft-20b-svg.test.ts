import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "../../runtime/node-types";
import { Recraft20bSvgNode } from "./recraft-20b-svg";

describe("Recraft20bSvgNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-20b-svg",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(Recraft20bSvgNode.nodeType.id).toBe("recraft-20b-svg");
    expect(Recraft20bSvgNode.nodeType.name).toBe("Text to SVG (Recraft 20B)");
    expect(Recraft20bSvgNode.nodeType.inputs).toHaveLength(4);
    expect(Recraft20bSvgNode.nodeType.inputs[0].name).toBe("prompt");
    expect(Recraft20bSvgNode.nodeType.inputs[0].type).toBe("string");
    expect(Recraft20bSvgNode.nodeType.inputs[0].required).toBe(true);
    expect(Recraft20bSvgNode.nodeType.inputs[1].name).toBe("style");
    expect(Recraft20bSvgNode.nodeType.inputs[1].value).toBe(
      "vector_illustration"
    );
    expect(Recraft20bSvgNode.nodeType.inputs[2].name).toBe("size");
    expect(Recraft20bSvgNode.nodeType.inputs[3].name).toBe("aspect_ratio");
    expect(Recraft20bSvgNode.nodeType.outputs).toHaveLength(1);
    expect(Recraft20bSvgNode.nodeType.outputs[0].name).toBe("svg");
    expect(Recraft20bSvgNode.nodeType.outputs[0].type).toBe("blob");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "A simple icon",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing prompt input", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty prompt", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
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
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
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
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        prompt: "A simple icon",
        style: "invalid_style",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept vector_illustration style", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
        style: "vector_illustration",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept icon style", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A home icon",
        style: "icon",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept vector_illustration substyle", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A simple logo",
        style: "vector_illustration/bold_stroke",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept icon substyle", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A settings icon",
        style: "icon/outline",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept valid aspect_ratio options", async () => {
    const node = new Recraft20bSvgNode({
      nodeId: "recraft-20b-svg",
    } as unknown as Node);

    const result = await node.execute(
      createContext({
        prompt: "A simple icon",
        aspect_ratio: "1:1",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });
});
