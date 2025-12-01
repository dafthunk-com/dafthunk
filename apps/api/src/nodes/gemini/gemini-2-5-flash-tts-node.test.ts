import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Gemini25FlashTtsNode } from "./gemini-2-5-flash-tts-node";

describe("Gemini25FlashTtsNode", () => {
  vi.mock("@google/genai", () => ({
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: "aGVsbG8=", // "hello" in base64
                      mimeType: "audio/wav",
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
      constructor() {}
    },
    Content: class MockContent {},
  }));

  const nodeId = "gemini-2-5-flash-tts";
  const node = new Gemini25FlashTtsNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      mode: "dev" as const,
      secrets: {},
      env: {
        DB: {} as any,
        AI: {} as any,
        AI_OPTIONS: {},
        RESSOURCES: {} as any,
        DATASETS: {} as any,
        DATASETS_AUTORAG: "",
        EMAIL_DOMAIN: "",
        CLOUDFLARE_ACCOUNT_ID: "test-account",
        CLOUDFLARE_API_TOKEN: "test-token",
        CLOUDFLARE_AI_GATEWAY_ID: "test-gateway",
      },
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should generate audio from text with default voice", async () => {
      const result = await node.execute(
        createContext({
          text: "Hello, this is a test message.",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
      expect(result.outputs?.audio.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.audio.mimeType).toBe("audio/wav");
    });

    it("should generate audio from text with specific voice", async () => {
      const result = await node.execute(
        createContext({
          text: "Say cheerfully: Have a wonderful day!",
          voice_name: "Puck",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
      expect(result.outputs?.audio.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.audio.mimeType).toBe("audio/wav");
    });

    it("should generate multi-speaker audio", async () => {
      const result = await node.execute(
        createContext({
          text: "Joe: How's it going today Jane?\nJane: Great, thanks for asking!",
          multi_speaker_config: {
            speakers: [
              { name: "Joe", voice: "Kore" },
              { name: "Jane", voice: "Puck" },
            ],
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
      expect(result.outputs?.audio.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.audio.mimeType).toBe("audio/wav");
    });

    it("should handle thinking budget configuration", async () => {
      const result = await node.execute(
        createContext({
          text: "This is a test message with thinking budget.",
          thinking_budget: 500,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
    });

    it("should return error when text is missing", async () => {
      const result = await node.execute(
        createContext({
          voice_name: "Kore",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Text is required");
    });
  });
});
