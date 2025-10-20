import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Gpt41Node } from "./gpt-41-node";

describe("Gpt41Node", () => {
  vi.mock("openai", () => ({
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "mocked response" } }],
          }),
        },
      };
      constructor() {}
    },
  }));
  const nodeId = "gpt-4-1";
  const node = new Gpt41Node({
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
              name: "Test OpenAI",
              provider: "openai",
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
  });
});
