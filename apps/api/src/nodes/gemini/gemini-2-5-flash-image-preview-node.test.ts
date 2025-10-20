import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Gemini25FlashImagePreviewNode } from "./gemini-2-5-flash-image-preview-node";

describe("Gemini25FlashImagePreviewNode", () => {
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

  const nodeId = "gemini-2-5-flash-image-preview";
  const node = new Gemini25FlashImagePreviewNode({
    nodeId,
  } as unknown as Node);

  const createContext = (
    inputs: Record<string, any>,
    includeIntegration = true
  ): NodeContext =>
    ({
      nodeId: "test",
      inputs: {
        integrationId: includeIntegration ? "test-integration" : undefined,
        ...inputs,
      },
      workflowId: "test",
      organizationId: "test-org",
      integrations: includeIntegration
        ? {
            "test-integration": {
              id: "test-integration",
              name: "Test Gemini",
              provider: "gemini",
              token: "test-api-key",
            },
          }
        : undefined,
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

    it("should return error when prompt is missing", async () => {
      const result = await node.execute(
        createContext({
          image: {
            data: "base64-image-data",
            mimeType: "image/jpeg",
          },
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Prompt is required");
    });

    it("should return error when API key is missing", async () => {
      const result = await node.execute(
        createContext(
          {
            prompt: "A beautiful landscape",
          },
          false
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Gemini integration is required");
    });
  });
});
