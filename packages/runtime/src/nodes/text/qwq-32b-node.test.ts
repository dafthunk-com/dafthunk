import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Qwq32BNode } from "./qwq-32b-node";

describe("Qwq32BNode", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    aiResponse?: { response?: string },
    aiError?: Error
  ): NodeContext => {
    const mockAI = {
      run: async () => {
        if (aiError) throw aiError;
        return aiResponse ?? { response: "Test response" };
      },
    };

    return {
      nodeId: "qwq-32b",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {
        AI: mockAI,
        AI_OPTIONS: {},
      },
    } as unknown as NodeContext;
  };

  it("should have correct node type metadata", () => {
    expect(Qwq32BNode.nodeType.id).toBe("qwq-32b");
    expect(Qwq32BNode.nodeType.name).toBe("QwQ 32B");
    expect(Qwq32BNode.nodeType.icon).toBe("sparkles");
    expect(Qwq32BNode.nodeType.usage).toBe(1);
    expect(Qwq32BNode.nodeType.tags).toContain("Reasoning");
    expect(Qwq32BNode.nodeType.tags).toContain("Qwen");
  });

  it("should generate text from a prompt", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const context = createContext(
      { prompt: "What is 2+2?" },
      { response: "Let me think step by step. 2+2 = 4." }
    );

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe(
      "Let me think step by step. 2+2 = 4."
    );
  });

  it("should generate text from messages", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const messages = JSON.stringify([
      { role: "user", content: "Explain recursion" },
    ]);
    const context = createContext(
      { messages },
      { response: "Recursion is when a function calls itself." }
    );

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe(
      "Recursion is when a function calls itself."
    );
  });

  it("should return error when AI service is not available", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const context = {
      nodeId: "qwq-32b",
      inputs: { prompt: "Hello" },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("AI service is not available");
  });

  it("should return error when AI.run throws", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const context = createContext(
      { prompt: "Hello" },
      undefined,
      new Error("Model unavailable")
    );

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Model unavailable");
  });

  it("should handle empty response", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const context = createContext({ prompt: "Hello" }, { response: "" });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("");
  });

  it("should handle undefined response", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const context = createContext({ prompt: "Hello" }, {});

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBeUndefined();
  });

  it("should calculate usage credits", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);
    const context = createContext(
      { prompt: "What is the meaning of life?" },
      { response: "The meaning of life is a philosophical question." }
    );

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.usage).toBeGreaterThanOrEqual(1);
  });

  it("should handle stream response", async () => {
    const node = new Qwq32BNode({ nodeId: "qwq-32b" } as unknown as Node);

    const encoder = new TextEncoder();
    const chunks = ["Hello", " world"];
    let chunkIndex = 0;

    const mockStream = new ReadableStream({
      pull(controller) {
        if (chunkIndex < chunks.length) {
          controller.enqueue(encoder.encode(chunks[chunkIndex]));
          chunkIndex++;
        } else {
          controller.close();
        }
      },
    });

    const mockAI = {
      run: async () => mockStream,
    };

    const context = {
      nodeId: "qwq-32b",
      inputs: { prompt: "Hello", stream: 1 },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {
        AI: mockAI,
        AI_OPTIONS: {},
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Hello world");
  });
});
