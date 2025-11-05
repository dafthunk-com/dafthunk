import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Gemini25FlashNode } from "./gemini-2-5-flash-node";

describe("Gemini25FlashNode", () => {
  vi.mock("@google/genai", () => ({
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: "mocked response",
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "mocked response",
                  },
                ],
              },
            },
          ],
        }),
      };
      constructor() {}
    },
  }));

  // Mock the tool registry
  vi.mock("../base-tool-registry", () => ({
    ToolCallTracker: class MockToolCallTracker {
      wrapToolDefinitions(tools: any[]) {
        return tools;
      }
      getToolCalls() {
        return [];
      }
    },
  }));

  const nodeId = "gemini-2-5-flash";
  const node = new Gemini25FlashNode({
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
    it("should generate text with simple prompt", async () => {
      const result = await node.execute(
        createContext({
          input: "Hello, how are you?",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should generate text with complex prompt", async () => {
      const result = await node.execute(
        createContext({
          input: "Write a short story about a robot learning to paint.",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle thinking budget configuration", async () => {
      const result = await node.execute(
        createContext({
          input: "Explain quantum computing",
          thinking_budget: 500,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle system instructions", async () => {
      const result = await node.execute(
        createContext({
          input: "What is 2+2?",
          instructions: "You are a math tutor. Always show your work.",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle function calling with tools", async () => {
      const result = await node.execute(
        createContext({
          input: "Calculate 5 + 3",
          tools: [
            {
              type: "node",
              identifier: "calculator",
            },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });
  });
});
