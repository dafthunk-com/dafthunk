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
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
        required: ["name"],
        additionalProperties: false,
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

/**
 * Two response shapes coexist in the Workers AI catalog.
 *
 * The fixture below is the shape GLM 4.7 Flash returns — the same OpenAI schema
 * its input follows. A node declaring a `response` output found nothing under
 * that name and reported success with an empty payload, which reached the
 * evaluation suite as a workflow that ran green and delivered no text.
 */
describe("CloudflareModelNode — chat-completion responses", () => {
  const chatCompletion = {
    id: "chatcmpl-1",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "Où est la gare ?" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 },
  };

  it("reads the assistant text onto the declared output", async () => {
    const aiRun = vi.fn().mockResolvedValue(chatCompletion);
    const result = await makeNode().execute(
      makeContext({ model: "@cf/zai-org/glm-4.7-flash", prompt: "hi" }, aiRun)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.response).toBe("Où est la gare ?");
  });

  it("still prefers an explicit field of that name", async () => {
    const aiRun = vi.fn().mockResolvedValue({
      response: "from the older shape",
      choices: [{ message: { content: "from the newer one" } }],
    });
    const result = await makeNode().execute(
      makeContext({ model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }, aiRun)
    );

    expect(result.outputs?.response).toBe("from the older shape");
  });

  it("joins the parts of a multimodal content array", async () => {
    const aiRun = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "Où est " },
              { type: "text", text: "la gare ?" },
            ],
          },
        },
      ],
    });
    const result = await makeNode().execute(
      makeContext({ model: "@cf/zai-org/glm-4.7-flash" }, aiRun)
    );

    expect(result.outputs?.response).toBe("Où est la gare ?");
  });

  it("leaves the output absent when there is no text anywhere", async () => {
    const aiRun = vi.fn().mockResolvedValue({ choices: [] });
    const result = await makeNode().execute(
      makeContext({ model: "@cf/zai-org/glm-4.7-flash" }, aiRun)
    );

    expect(result.outputs?.response).toBeUndefined();
  });
});

describe("CloudflareModelNode — truncation reporting", () => {
  function captureWarnings() {
    return vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  it("reports a generation cut off at its ceiling on the OpenAI shape", async () => {
    const warn = captureWarnings();
    const aiRun = vi.fn().mockResolvedValue({
      choices: [
        { message: { content: "half a thou" }, finish_reason: "length" },
      ],
      usage: { prompt_tokens: 12, completion_tokens: 4096 },
    });

    await makeNode().execute(
      makeContext(
        { model: "@cf/zai-org/glm-4.7-flash", prompt: "hi", max_tokens: 4096 },
        aiRun
      )
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("hit its output ceiling");
    expect(warn.mock.calls[0][0]).toContain("4096/4096");
    expect(warn.mock.calls[0][0]).toContain("finish_reason=length");
    warn.mockRestore();
  });

  /**
   * The `{ response }` models carry no `finish_reason` at all, so spending the
   * whole allowance is the only evidence available. This is the shape `ai-text`
   * actually uses.
   */
  it("infers the ceiling from usage when the shape has no finish_reason", async () => {
    const warn = captureWarnings();
    const aiRun = vi.fn().mockResolvedValue({
      response: "a long answer",
      usage: { prompt_tokens: 40, completion_tokens: 512 },
    });

    await makeNode().execute(
      makeContext(
        {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "summarize",
          max_tokens: 512,
        },
        aiRun
      )
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("512/512");
    warn.mockRestore();
  });

  /**
   * The case the instrument exists to distinguish: a verbose answer the model
   * chose to end. Silence here is what makes a long output a prompt problem
   * rather than a budget one.
   */
  it("stays silent when the model stopped on its own", async () => {
    const warn = captureWarnings();
    const aiRun = vi.fn().mockResolvedValue({
      response: "a complete answer",
      usage: { prompt_tokens: 40, completion_tokens: 3200 },
    });

    await makeNode().execute(
      makeContext(
        {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "summarize",
          max_tokens: 4096,
        },
        aiRun
      )
    );

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("stays silent when no ceiling was requested and none was reported", async () => {
    const warn = captureWarnings();
    const aiRun = vi.fn().mockResolvedValue({
      response: "an answer",
      usage: { prompt_tokens: 40, completion_tokens: 900 },
    });

    await makeNode().execute(
      makeContext(
        { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", prompt: "hi" },
        aiRun
      )
    );

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
