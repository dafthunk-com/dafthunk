import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { Gemini25FlashTtsNode } from "./gemini-2-5-flash-tts-node";

describe("Gemini25FlashTtsNode", () => {
  // Base64 of a minimal fake PCM payload (not a real WAV, so it will get wrapped)
  const fakePcmBase64 = Buffer.from(new Uint8Array([1, 2, 3, 4, 5])).toString(
    "base64"
  );

  // Base64 of a fake WAV payload (starts with RIFF)
  const fakeWavBytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
  ]);
  const fakeWavBase64 = Buffer.from(fakeWavBytes).toString("base64");

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
                      data: Buffer.from(
                        new Uint8Array([1, 2, 3, 4, 5])
                      ).toString("base64"),
                      mimeType: "audio/L16;rate=24000",
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 50,
            candidatesTokenCount: 200,
            totalTokenCount: 250,
          },
        }),
      };
    },
  }));

  const nodeId = "gemini-2-5-flash-tts";
  const node = new Gemini25FlashTtsNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      mode: "dev" as const,
      secrets: {},
      env: {
        DB: {} as never,
        AI: {} as never,
        AI_OPTIONS: {},
        RESSOURCES: {} as never,
        DATASETS: {} as never,
        DATASETS_AUTORAG: "",
        EMAIL_DOMAIN: "",
        CLOUDFLARE_ACCOUNT_ID: "test-account",
        CLOUDFLARE_API_TOKEN: "test-token",
        CLOUDFLARE_AI_GATEWAY_ID: "test-gateway",
      },
    }) as unknown as NodeContext;

  describe("nodeType", () => {
    it("should have the correct static properties", () => {
      expect(Gemini25FlashTtsNode.nodeType.id).toBe("gemini-2-5-flash-tts");
      expect(Gemini25FlashTtsNode.nodeType.type).toBe("gemini-2-5-flash-tts");
      expect(Gemini25FlashTtsNode.nodeType.inlinable).toBe(false);
      expect(Gemini25FlashTtsNode.nodeType.asTool).toBe(false);
      expect(Gemini25FlashTtsNode.nodeType.usage).toBe(1);
    });

    it("should have required text input", () => {
      const textInput = Gemini25FlashTtsNode.nodeType.inputs.find(
        (i) => i.name === "text"
      );
      expect(textInput).toBeDefined();
      expect(textInput?.required).toBe(true);
      expect(textInput?.type).toBe("string");
    });

    it("should have optional voice input with default Kore", () => {
      const voiceInput = Gemini25FlashTtsNode.nodeType.inputs.find(
        (i) => i.name === "voice"
      );
      expect(voiceInput).toBeDefined();
      expect(voiceInput?.value).toBe("Kore");
    });

    it("should have audio and usage_metadata outputs", () => {
      const audioOutput = Gemini25FlashTtsNode.nodeType.outputs.find(
        (o) => o.name === "audio"
      );
      const usageOutput = Gemini25FlashTtsNode.nodeType.outputs.find(
        (o) => o.name === "usage_metadata"
      );
      expect(audioOutput?.type).toBe("audio");
      expect(usageOutput?.type).toBe("json");
      expect(usageOutput?.hidden).toBe(true);
    });
  });

  describe("execute", () => {
    it("should generate audio from text", async () => {
      const result = await node.execute(
        createContext({
          text: "Hello, how are you today?",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
      expect(result.outputs?.audio.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.audio.mimeType).toBe("audio/wav");
    });

    it("should generate audio with a specific voice", async () => {
      const result = await node.execute(
        createContext({
          text: "Say this in a cheerful tone.",
          voice: "Puck",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
      expect(result.outputs?.audio.mimeType).toBe("audio/wav");
    });

    it("should use default voice Kore when voice is not provided", async () => {
      const result = await node.execute(
        createContext({
          text: "Testing default voice",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.audio).toBeDefined();
    });

    it("should wrap PCM data in WAV header", async () => {
      const result = await node.execute(
        createContext({
          text: "Generate some audio",
        })
      );

      expect(result.status).toBe("completed");
      const audioData = result.outputs?.audio.data as Uint8Array;
      // WAV header starts with "RIFF"
      expect(audioData[0]).toBe(0x52); // R
      expect(audioData[1]).toBe(0x49); // I
      expect(audioData[2]).toBe(0x46); // F
      expect(audioData[3]).toBe(0x46); // F
      // PCM payload (5 bytes) + 44-byte WAV header = 49 bytes total
      expect(audioData.length).toBe(49);
    });

    it("should include usage metadata in output", async () => {
      const result = await node.execute(
        createContext({
          text: "Check usage metadata",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.usage_metadata).toBeDefined();
      expect(result.outputs?.usage_metadata.promptTokenCount).toBe(50);
      expect(result.outputs?.usage_metadata.candidatesTokenCount).toBe(200);
      expect(result.outputs?.usage_metadata.totalTokenCount).toBe(250);
    });

    it("should return error when text is missing", async () => {
      const result = await node.execute(createContext({}));

      expect(result.status).toBe("error");
      expect(result.error).toContain("Text input is required");
    });

    it("should return error when text is empty string", async () => {
      const result = await node.execute(
        createContext({
          text: "",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Text input is required");
    });

    it("should return error when text is not a string", async () => {
      const result = await node.execute(
        createContext({
          text: 123,
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Text input is required");
    });

    it("should return error for invalid voice name", async () => {
      const result = await node.execute(
        createContext({
          text: "Hello",
          voice: "InvalidVoice",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid voice");
      expect(result.error).toContain("InvalidVoice");
    });

    it("should accept all valid voice names", async () => {
      const validVoices = [
        "Zephyr",
        "Puck",
        "Charon",
        "Kore",
        "Fenrir",
        "Leda",
        "Orus",
        "Aoede",
        "Sulafat",
      ];

      for (const voice of validVoices) {
        const result = await node.execute(
          createContext({
            text: "Test voice",
            voice,
          })
        );

        expect(result.status).toBe("completed");
      }
    });
  });
});
