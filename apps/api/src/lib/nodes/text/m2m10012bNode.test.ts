import { describe, it, expect, vi } from "vitest";
import { Node } from "../../api/types";
import { M2m10012bNode } from "./m2m10012bNode";

describe("M2m10012bNode", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Translation",
    type: "m2m100-1.2b",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text to be translated",
        required: true,
      },
      {
        name: "sourceLang",
        type: "string",
        description: "The language code of the source text",
      },
      {
        name: "targetLang",
        type: "string",
        description: "The language code to translate the text into",
        required: true,
      },
    ],
    outputs: [
      {
        name: "translatedText",
        type: "string",
        description: "The translated text in the target language",
      },
    ],
  };

  const mockEnv = {
    AI: {
      run: vi.fn(),
      toMarkdown: vi.fn(),
      aiGatewayLogId: "test-log-id",
      gateway: vi.fn().mockReturnValue({
        /* mock AiGateway object */
      }),
      autorag: vi.fn().mockReturnValue({
        /* mock AutoRAG object */
      }),
      models: vi.fn().mockResolvedValue([]),
    },
  };

  it("should return error if AI service is not available", async () => {
    const node = new M2m10012bNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        text: "Hello world",
        targetLang: "es",
      },
      env: undefined as any,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI service is not available");
  });

  it("should translate text and return result", async () => {
    const mockAIRun = vi.fn().mockResolvedValue({
      translated_text: "Hola mundo",
    });
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };
    const node = new M2m10012bNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        text: "Hello world",
        sourceLang: "en",
        targetLang: "es",
      },
      env: {
        AI: mockAI,
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith("@cf/meta/m2m100-1.2b", {
      text: "Hello world",
      source_lang: "en",
      target_lang: "es",
    });
    expect(result.success).toBe(true);
    expect(result.outputs?.translatedText).toBe("Hola mundo");
  });

  it("should use default source language if not provided", async () => {
    const mockAIRun = vi.fn().mockResolvedValue({
      translated_text: "Hola mundo",
    });
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };

    const node = new M2m10012bNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        text: "Hello world",
        targetLang: "es",
      },
      env: {
        AI: mockAI,
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith("@cf/meta/m2m100-1.2b", {
      text: "Hello world",
      source_lang: "en",
      target_lang: "es",
    });
    expect(result.success).toBe(true);
    expect(result.outputs?.translatedText).toBe("Hola mundo");
  });

  it("should handle errors during execution", async () => {
    const mockAIRun = vi
      .fn()
      .mockRejectedValue(new Error("Translation failed"));
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };
    const node = new M2m10012bNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        text: "Hello world",
        targetLang: "es",
      },
      env: {
        AI: mockAI,
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Translation failed");
  });
});
