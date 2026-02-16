import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { Qwen330BA3BFp8Node } from "./qwen3-30b-a3b-fp8-node";

describe("Qwen330BA3BFp8Node", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    aiResponse?: Record<string, unknown>
  ): NodeContext => {
    const mockAI = {
      run: async () =>
        aiResponse ?? {
          choices: [
            {
              message: {
                content: "Hello! How can I help you?",
                reasoning_content: "The user greeted me.",
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
          },
        },
    };

    return {
      nodeId: "qwen3-30b-a3b-fp8",
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
    expect(Qwen330BA3BFp8Node.nodeType.id).toBe("qwen3-30b-a3b-fp8");
    expect(Qwen330BA3BFp8Node.nodeType.name).toBe("Qwen3 30B A3B");
    expect(Qwen330BA3BFp8Node.nodeType.icon).toBe("sparkles");
    expect(Qwen330BA3BFp8Node.nodeType.functionCalling).toBe(true);
    expect(Qwen330BA3BFp8Node.nodeType.usage).toBe(1);
  });

  it("should generate text from a prompt", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(createContext({ prompt: "Hello" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Hello! How can I help you?");
    expect(result.outputs?.reasoning).toBe("The user greeted me.");
  });

  it("should generate text from messages JSON", async () => {
    const messages = JSON.stringify([
      { role: "user", content: "What is 2+2?" },
    ]);
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ prompt: "fallback", messages })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Hello! How can I help you?");
  });

  it("should fall back to prompt when messages JSON is invalid", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ prompt: "Hello", messages: "not-valid-json" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Hello! How can I help you?");
  });

  it("should return error when AI service is not available", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const context = {
      nodeId: "qwen3-30b-a3b-fp8",
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

  it("should return error when neither prompt nor messages provided", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Either prompt or messages must be provided"
    );
  });

  it("should handle response without reasoning content", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(
      createContext(
        { prompt: "Hello" },
        {
          choices: [
            {
              message: {
                content: "Hi there!",
              },
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 10,
          },
        }
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Hi there!");
    expect(result.outputs?.reasoning).toBeUndefined();
  });

  it("should handle empty response from model", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(
      createContext(
        { prompt: "Hello" },
        {
          choices: [{ message: {} }],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 0,
          },
        }
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("");
  });

  it("should handle AI.run throwing an error", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const context = {
      nodeId: "qwen3-30b-a3b-fp8",
      inputs: { prompt: "Hello" },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {
        AI: {
          run: async () => {
            throw new Error("Model inference failed");
          },
        },
        AI_OPTIONS: {},
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Model inference failed");
  });

  it("should fall back to text estimation when usage is not available", async () => {
    const node = new Qwen330BA3BFp8Node({
      nodeId: "qwen3-30b-a3b-fp8",
    } as unknown as Node);
    const result = await node.execute(
      createContext(
        { prompt: "Hello" },
        {
          choices: [
            {
              message: {
                content: "Response text",
              },
            },
          ],
        }
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Response text");
    expect(result.usage).toBeGreaterThanOrEqual(1);
  });
});
