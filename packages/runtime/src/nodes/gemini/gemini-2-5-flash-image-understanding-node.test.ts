import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { Gemini25FlashImageUnderstandingNode } from "./gemini-2-5-flash-image-understanding-node";

describe("Gemini25FlashImageUnderstandingNode", () => {
  vi.mock("@google/genai", () => ({
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "This image shows a beautiful landscape with mountains in the background and a lake in the foreground. The scene appears to be during sunset with warm golden lighting.",
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
    },
  }));

  const nodeId = "gemini-2-5-flash-image-understanding";
  const node = new Gemini25FlashImageUnderstandingNode({
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

  const createMockImage = (mimeType = "image/png") => ({
    data: new Uint8Array([1, 2, 3, 4, 5]), // Mock image data
    mimeType,
  });

  describe("execute", () => {
    it("should analyze image with default prompt", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
          prompt: "Describe this image",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
      expect(result.outputs?.text).toContain("beautiful landscape");
      expect(result.outputs?.finish_reason).toBe("STOP");
    });

    it("should analyze image with custom prompt", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage("image/jpeg"),
          prompt: "What objects do you see in this image?",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
      expect(result.outputs?.text).toContain("mountains");
    });

    it("should handle object detection prompts", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
          prompt: "Identify and describe all objects visible in this image",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle thinking budget configuration", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
          prompt: "Analyze this image content",
          thinking_budget: 500,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should return error when image is missing", async () => {
      const result = await node.execute(
        createContext({
          prompt: "Describe this image",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Image input is required");
    });

    it("should return error when prompt is missing", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Prompt is required");
    });

    it("should handle different image formats", async () => {
      const formats = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/heic",
        "image/heif",
      ];

      for (const format of formats) {
        const result = await node.execute(
          createContext({
            image: createMockImage(format),
            prompt: "Describe this image",
          })
        );

        expect(result.status).toBe("completed");
        expect(result.outputs?.text).toBeDefined();
      }
    });

    it("should handle large image files without stack overflow", async () => {
      // Create a larger mock image file to test the base64 conversion
      const largeImageData = new Uint8Array(100000); // 100KB of data
      for (let i = 0; i < largeImageData.length; i++) {
        largeImageData[i] = Math.floor(Math.random() * 256);
      }

      const result = await node.execute(
        createContext({
          image: {
            data: largeImageData,
            mimeType: "image/png",
          },
          prompt: "Describe this image",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle text recognition prompts", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
          prompt: "Extract and read any text visible in this image",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle scene analysis prompts", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
          prompt: "What activity or scene is happening in this image?",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });
  });
});
