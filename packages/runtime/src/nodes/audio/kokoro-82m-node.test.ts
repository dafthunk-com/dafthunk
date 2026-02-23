import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Kokoro82mNode } from "./kokoro-82m-node";

describe("Kokoro82mNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "kokoro-82m",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(Kokoro82mNode.nodeType.id).toBe("kokoro-82m");
    expect(Kokoro82mNode.nodeType.name).toBe("Text to Speech (Kokoro)");
    expect(Kokoro82mNode.nodeType.inputs).toHaveLength(3);
    expect(Kokoro82mNode.nodeType.inputs[0].name).toBe("text");
    expect(Kokoro82mNode.nodeType.inputs[0].type).toBe("string");
    expect(Kokoro82mNode.nodeType.inputs[0].required).toBe(true);
    expect(Kokoro82mNode.nodeType.outputs).toHaveLength(1);
    expect(Kokoro82mNode.nodeType.outputs[0].name).toBe("audio");
    expect(Kokoro82mNode.nodeType.outputs[0].type).toBe("audio");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        text: "Hello, world!",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing text input", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for empty text", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        text: "",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for invalid text type", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        text: 123,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for invalid voice option", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        text: "Hello, world!",
        voice: "invalid_voice",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should accept valid voice option", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        text: "Hello, world!",
        voice: "bf_emma",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should accept valid speed value", async () => {
    const node = new Kokoro82mNode({
      nodeId: "kokoro-82m",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        text: "Hello, world!",
        speed: 1.5,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });
});
