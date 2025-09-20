import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Gemini25FlashAudioUnderstandingNode } from "./gemini-2-5-flash-audio-understanding-node";

describe("Gemini25FlashAudioUnderstandingNode", () => {
  vi.mock("@google/genai", () => ({
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "This is a transcript of the audio content. The speaker discusses various topics including technology and innovation.",
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 25,
            totalTokenCount: 175,
          },
        }),
      };
      constructor() {}
    },
  }));

  const nodeId = "gemini-2-5-flash-audio-understanding";
  const node = new Gemini25FlashAudioUnderstandingNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      env: {
        DB: {} as any,
        AI: {} as any,
        AI_OPTIONS: {},
        RESSOURCES: {} as any,
        DATASETS: {} as any,
        DATASETS_AUTORAG: "",
        EMAIL_DOMAIN: "",
        CLOUDFLARE_ACCOUNT_ID: "",
        CLOUDFLARE_API_TOKEN: "",
        CLOUDFLARE_AI_GATEWAY_ID: "",
        TWILIO_ACCOUNT_SID: "",
        TWILIO_AUTH_TOKEN: "",
        TWILIO_PHONE_NUMBER: "",
        SENDGRID_API_KEY: "",
        SENDGRID_DEFAULT_FROM: "",
        RESEND_API_KEY: "",
        RESEND_DEFAULT_FROM: "",
        AWS_ACCESS_KEY_ID: "",
        AWS_SECRET_ACCESS_KEY: "",
        AWS_REGION: "",
        SES_DEFAULT_FROM: "",
        OPENAI_API_KEY: "",
        ANTHROPIC_API_KEY: "",
        GEMINI_API_KEY: "test",
      },
    }) as unknown as NodeContext;

  const createMockAudio = (mimeType = "audio/wav") => ({
    data: new Uint8Array([1, 2, 3, 4, 5]), // Mock audio data
    mimeType,
  });

  describe("execute", () => {
    it("should transcribe audio with default prompt", async () => {
      const result = await node.execute(
        createContext({
          audio: createMockAudio(),
          prompt: "Transcribe this audio",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
      expect(result.outputs?.text).toContain("This is a transcript");
      expect(result.outputs?.finish_reason).toBe("STOP");
    });

    it("should analyze audio with custom prompt", async () => {
      const result = await node.execute(
        createContext({
          audio: createMockAudio("audio/mp3"),
          prompt: "Describe what you hear in this audio clip",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
      expect(result.outputs?.text).toContain("speaker discusses");
    });

    it("should handle timestamp-based analysis", async () => {
      const result = await node.execute(
        createContext({
          audio: createMockAudio(),
          prompt: "Provide a transcript from 02:30 to 03:29",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle thinking budget configuration", async () => {
      const result = await node.execute(
        createContext({
          audio: createMockAudio(),
          prompt: "Analyze this audio content",
          thinking_budget: 500,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should return error when audio is missing", async () => {
      const result = await node.execute(
        createContext({
          prompt: "Transcribe this audio",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Audio input is required");
    });

    it("should return error when prompt is missing", async () => {
      const result = await node.execute(
        createContext({
          audio: createMockAudio(),
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Prompt is required");
    });

    it("should return error when API key is missing", async () => {
      const context = createContext({
        audio: createMockAudio(),
        prompt: "Transcribe this audio",
      });
      context.env.GEMINI_API_KEY = "";

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Gemini API key is required");
    });

    it("should handle different audio formats", async () => {
      const formats = [
        "audio/wav",
        "audio/mp3",
        "audio/aiff",
        "audio/aac",
        "audio/ogg",
        "audio/flac",
      ];

      for (const format of formats) {
        const result = await node.execute(
          createContext({
            audio: createMockAudio(format),
            prompt: "Transcribe this audio",
          })
        );

        expect(result.status).toBe("completed");
        expect(result.outputs?.text).toBeDefined();
      }
    });

    it("should handle large audio files without stack overflow", async () => {
      // Create a larger mock audio file to test the base64 conversion
      const largeAudioData = new Uint8Array(100000); // 100KB of data
      for (let i = 0; i < largeAudioData.length; i++) {
        largeAudioData[i] = Math.floor(Math.random() * 256);
      }

      const result = await node.execute(
        createContext({
          audio: {
            data: largeAudioData,
            mimeType: "audio/wav",
          },
          prompt: "Transcribe this audio",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });
  });
});
