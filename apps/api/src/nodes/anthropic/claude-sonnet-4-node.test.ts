import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { ClaudeSonnet4Node } from "./claude-sonnet-4-node";

describe("ClaudeSonnet4Node", () => {
  vi.mock("@anthropic-ai/sdk", () => ({
    APIError: class MockError extends Error {},
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "mocked response" }],
        }),
      };
      constructor() {}
    },
  }));
  const nodeId = "claude-sonnet-4";
  const node = new ClaudeSonnet4Node({
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
              name: "Test Anthropic",
              provider: "anthropic",
              token: "test-api-key",
            },
          }
        : undefined,
      secrets: {},
      getIntegration: async (id: string) => {
        if (includeIntegration && id === "test-integration") {
          return {
            id: "test-integration",
            name: "Test Anthropic",
            provider: "anthropic",
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
  });
});
