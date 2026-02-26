import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { Gemini3FlashNode } from "./gemini-3-flash-node";

describe("Gemini3FlashNode", () => {
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

  const nodeId = "gemini-3-flash";
  const node = new Gemini3FlashNode({
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
