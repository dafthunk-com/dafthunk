import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { Gpt5Node } from "./gpt-5-node";

describe("Gpt5Node", () => {
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
  const nodeId = "gpt-5";
  const node = new Gpt5Node({
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
