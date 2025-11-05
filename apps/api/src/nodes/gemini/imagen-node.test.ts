import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { ImagenNode } from "./imagen-node";

describe("ImagenNode", () => {
  vi.mock("@google/genai", () => ({
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateImages: vi.fn().mockResolvedValue({
          generatedImages: [
            {
              image: {
                imageBytes: "aGVsbG8=", // "hello" in base64
                mimeType: "image/png",
              },
              finishReason: "STOP",
              safetyRatings: [],
            },
            {
              image: {
                imageBytes: "d29ybGQ=", // "world" in base64
                mimeType: "image/png",
              },
              finishReason: "STOP",
              safetyRatings: [],
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            totalTokenCount: 10,
          },
        }),
      };
      constructor() {}
    },
  }));

  const nodeId = "imagen";
  const node = new ImagenNode({
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
    mode: "dev" as const,
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
      getIntegration: async (id: string) => {
        if (includeIntegration && id === "test-integration") {
          return {
            id: "test-integration",
            name: "Test Gemini",
            provider: "gemini",
            token: "test-api-key",
          };
        }
        throw new Error(`Integration ${id} not found`);
      },
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
      },
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should generate images with basic prompt", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A beautiful sunset over mountains",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
      expect(result.outputs?.image.mimeType).toBe("image/png");
    });

    it("should generate images with custom parameters", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A futuristic cityscape at night",
          aspectRatio: "16:9",
          sampleImageSize: "2K",
          personGeneration: "dont_allow",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
    });

    it("should handle usage metadata", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A robot in a garden",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.usage_metadata).toBeDefined();
      expect(result.outputs?.usage_metadata.promptTokenCount).toBe(10);
    });

    it("should return error when prompt is missing", async () => {
      const result = await node.execute(
        createContext({
          aspectRatio: "16:9",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Prompt is required");
    });

    it("should return error when integration is missing", async () => {
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

    it("should validate aspectRatio values", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A dog",
          aspectRatio: "invalid",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid aspectRatio");
    });

    it("should validate sampleImageSize values", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A bird",
          sampleImageSize: "3K",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid sampleImageSize");
    });

    it("should validate personGeneration values", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A person",
          personGeneration: "invalid",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid personGeneration");
    });

    it("should use default values when parameters are not provided", async () => {
      const result = await node.execute(
        createContext({
          prompt: "A simple test image",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toBeDefined();
      // Should use defaults: aspectRatio="1:1", personGeneration="allow_adult"
    });
  });
});
