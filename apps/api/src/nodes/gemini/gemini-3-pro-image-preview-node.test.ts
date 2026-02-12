import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { Gemini3ProImagePreviewNode } from "./gemini-3-pro-image-preview-node";

describe("Gemini3ProImagePreviewNode", () => {
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
                      mimeType: "image/png",
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

  const nodeId = "gemini-3-pro-image-preview";
  const node = new Gemini3ProImagePreviewNode({
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
    it("should generate image from text prompt", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A beautiful sunset over mountains",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
      expect(result.outputs?.image.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.image.mimeType).toBe("image/png");
    });

    it("should generate image from text prompt and input image", async () => {
      const result = await node.execute(
        createContext({
          prompt: "Transform this image into a cartoon style",
          image1: {
            data: "base64-image-data",
            mimeType: "image/jpeg",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
      expect(result.outputs?.image.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.image.mimeType).toBe("image/png");
    });

    it("should generate image from text prompt and multiple input images", async () => {
      const result = await node.execute(
        createContext({
          prompt: "Combine these images into a landscape with a person",
          image1: {
            data: "base64-image-data-1",
            mimeType: "image/jpeg",
          },
          image2: {
            data: "base64-image-data-2",
            mimeType: "image/png",
          },
          image3: {
            data: "base64-image-data-3",
            mimeType: "image/gif",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
      expect(result.outputs?.image.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs?.image.mimeType).toBe("image/png");
    });

    it("should handle thinking budget configuration", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A futuristic cityscape",
          thinking_budget: 500,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
    });

    it("should handle aspect ratio configuration", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A wide landscape panorama",
          aspectRatio: "21:9",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
    });

    it("should handle image size configuration", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A high-resolution portrait",
          imageSize: "4K",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
    });

    it("should return error when prompt is missing", async () => {
      const result = await node.execute(
        createContext({
          image1: {
            data: "base64-image-data",
            mimeType: "image/jpeg",
          },
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Prompt is required");
    });

    it("should return error for invalid aspect ratio", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A test image",
          aspectRatio: "invalid",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid aspectRatio");
    });

    it("should return error for invalid image size", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A test image",
          imageSize: "8K",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid imageSize");
    });
  });
});
