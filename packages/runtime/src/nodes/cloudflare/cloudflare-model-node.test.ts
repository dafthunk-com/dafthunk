import type { NodeContext } from "@dafthunk/runtime";
import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { CloudflareModelNode } from "./cloudflare-model-node";

vi.mock("@cloudflare/ai-utils", () => ({
  runWithTools: vi.fn(),
}));

const responseSchema: Schema = {
  name: "Person",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "age", type: "integer" },
  ],
};

function makeNode(): CloudflareModelNode {
  return new CloudflareModelNode({
    nodeId: "test",
    type: "cloudflare-model",
    inputs: [
      { name: "model", type: "string" },
      { name: "schema", type: "schema" },
      { name: "prompt", type: "string" },
      { name: "response_format", type: "json" },
      { name: "tools", type: "json" },
    ],
    outputs: [{ name: "response", type: "any" }],
  } as unknown as Node);
}

function makeContext(
  inputs: Record<string, unknown>,
  aiRun: ReturnType<typeof vi.fn>
): NodeContext {
  return {
    nodeId: "test",
    inputs,
    workflowId: "test",
    organizationId: "test-org",
    mode: "dev" as const,
    secrets: {},
    env: {
      AI: { run: aiRun },
      AI_OPTIONS: {},
    },
  } as unknown as NodeContext;
}

describe("CloudflareModelNode — response_format translation", () => {
  it("translates a Dafthunk Schema input into the OpenAI-style response_format", async () => {
    const aiRun = vi.fn().mockResolvedValue({
      response: '{"name":"Ada","age":36}',
      usage: { prompt_tokens: 5, completion_tokens: 10 },
    });
    const node = makeNode();

    const result = await node.execute(
      makeContext(
        {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "Extract a person from: Ada Lovelace, 36",
          schema: responseSchema,
        },
        aiRun
      )
    );

    expect(result.status).toBe("completed");
    expect(aiRun).toHaveBeenCalledOnce();

    const aiPayload = aiRun.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(aiPayload.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "Person",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "integer" },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
    });

    // The Dafthunk-only `schema` key must NOT leak into the AI payload.
    expect("schema" in aiPayload).toBe(false);
  });

  it("schema input wins over a manually-provided response_format value", async () => {
    const aiRun = vi.fn().mockResolvedValue({ response: "{}" });
    const node = makeNode();

    await node.execute(
      makeContext(
        {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "test",
          schema: responseSchema,
          response_format: { type: "json_object" },
        },
        aiRun
      )
    );

    const aiPayload = aiRun.mock.calls[0]?.[1] as {
      response_format: { type: string };
    };
    expect(aiPayload.response_format.type).toBe("json_schema");
  });

  it("leaves response_format unset when no schema is provided", async () => {
    const aiRun = vi.fn().mockResolvedValue({ response: "ok" });
    const node = makeNode();

    await node.execute(
      makeContext(
        {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "test",
        },
        aiRun
      )
    );

    const aiPayload = aiRun.mock.calls[0]?.[1] as Record<string, unknown>;
    expect("response_format" in aiPayload).toBe(false);
  });

  it("falls back to a system-message instruction in the tool-calling path", async () => {
    const { runWithTools } = await import("@cloudflare/ai-utils");
    const runWithToolsMock = vi.mocked(runWithTools);
    runWithToolsMock.mockResolvedValue({ response: '{"name":"x"}' } as never);

    const node = makeNode();
    // Stub the tool-resolution step so we don't need a real tool registry.
    vi.spyOn(
      node as unknown as {
        convertFunctionCallsToToolDefinitions: (...args: unknown[]) => unknown;
      },
      "convertFunctionCallsToToolDefinitions"
    ).mockResolvedValue([
      {
        name: "noop",
        description: "noop",
        parameters: { type: "object", properties: {} },
        function: vi.fn(),
      },
    ] as never);

    await node.execute(
      makeContext(
        {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "Extract a person",
          schema: responseSchema,
          tools: [{ type: "node", identifier: "calculator" }],
        },
        vi.fn()
      )
    );

    expect(runWithToolsMock).toHaveBeenCalledOnce();
    const payload = runWithToolsMock.mock.calls[0]?.[2] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(payload.messages[0].role).toBe("system");
    expect(payload.messages[0].content).toContain(
      "valid JSON matching this schema"
    );
    expect(payload.messages[1]).toEqual({
      role: "user",
      content: "Extract a person",
    });
  });
});
