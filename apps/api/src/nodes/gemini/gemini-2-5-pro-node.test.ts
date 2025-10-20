import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Gemini25ProNode } from "./gemini-2-5-pro-node";

describe("Gemini25ProNode", () => {
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

  const nodeId = "gemini-2-5-pro";
  const node = new Gemini25ProNode({
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
          input:
            "Design a microservices architecture for an e-commerce platform.",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBeDefined();
    });

    it("should handle function calling with tools", async () => {
      const result = await node.execute(
        createContext({
          input: "Calculate the square root of 16",
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
