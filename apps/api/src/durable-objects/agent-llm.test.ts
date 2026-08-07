import { describe, expect, it } from "vitest";

import { readWorkersAiReply } from "./agent-llm";

/**
 * Where a Workers AI model puts its tool calls, which is not one place.
 *
 * The agent loop read only `choices[0].message.tool_calls` — the OpenAI shape —
 * and every Workers AI model that answers differently looked to it like a model
 * with nothing to call. The evaluation suite caught it as a digest whose
 * delivered text was a wall of `<tool_call>` blocks: the agent had written the
 * calls out, nobody had executed them, and the reader got the syntax.
 *
 * The shipped templates never hit this because they go through `runWithTools`,
 * which knows the conventions. Only the hand-rolled path was blind.
 */
describe("readWorkersAiReply", () => {
  it("reads the OpenAI shape", () => {
    const { content, toolCalls } = readWorkersAiReply({
      choices: [
        {
          message: {
            content: "",
            tool_calls: [
              {
                id: "call_1",
                function: {
                  name: "node_fetch",
                  arguments: '{"url":"https://example.com"}',
                },
              },
            ],
          },
        },
      ],
    });

    expect(content).toBe("");
    expect(toolCalls).toEqual([
      {
        id: "call_1",
        name: "node_fetch",
        arguments: { url: "https://example.com" },
      },
    ]);
  });

  it("reads the Workers AI top-level shape", () => {
    // `@cf/qwen/qwen3-30b-a3b-fp8` returns `tool_calls` beside `response`,
    // not inside `choices` — confirmed by `model-probe.integration.ts`.
    const { content, toolCalls } = readWorkersAiReply({
      response: "Looking that up.",
      tool_calls: [
        { name: "node_fetch", arguments: { url: "https://example.com" } },
      ],
    });

    expect(content).toBe("Looking that up.");
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe("node_fetch");
    expect(toolCalls[0].arguments).toEqual({ url: "https://example.com" });
  });

  /** Verbatim from the shape that reached the evaluation report. */
  it("reads calls written into the text", () => {
    const { content, toolCalls } = readWorkersAiReply({
      choices: [
        {
          message: {
            content:
              'Here is the digest.\n<tool_call>\n{"name": "node_fetch", "arguments": {"url": "https://hacker-news.firebaseio.com/v0/item/49192566.json", "method": "GET"}}\n</tool_call>\n<tool_call>\n{"name": "node_fetch", "arguments": {"url": "https://hacker-news.firebaseio.com/v0/item/49184960.json"}}\n</tool_call>',
          },
        },
      ],
    });

    expect(toolCalls).toHaveLength(2);
    expect(toolCalls[0].name).toBe("node_fetch");
    expect(toolCalls[0].arguments.url).toBe(
      "https://hacker-news.firebaseio.com/v0/item/49192566.json"
    );
    // The plumbing is removed; what the model meant to say survives.
    expect(content).toBe("Here is the digest.");
    expect(content).not.toContain("<tool_call>");
  });

  it("prefers structured calls and leaves quoted syntax in the prose alone", () => {
    const { content, toolCalls } = readWorkersAiReply({
      choices: [
        {
          message: {
            content: 'Models emit <tool_call>{"name": "x"}</tool_call> blocks.',
            tool_calls: [{ function: { name: "node_fetch", arguments: "{}" } }],
          },
        },
      ],
    });

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe("node_fetch");
    expect(content).toContain("<tool_call>");
  });

  it("ignores a malformed block rather than inventing a call", () => {
    const { toolCalls } = readWorkersAiReply({
      choices: [
        { message: { content: "<tool_call>not json at all</tool_call>" } },
      ],
    });

    expect(toolCalls).toEqual([]);
  });

  it("returns a plain answer untouched", () => {
    const { content, toolCalls } = readWorkersAiReply({
      choices: [{ message: { content: "May was the best month." } }],
    });

    expect(content).toBe("May was the best month.");
    expect(toolCalls).toEqual([]);
  });

  it("survives an empty or unexpected payload", () => {
    expect(readWorkersAiReply(undefined)).toEqual({
      content: "",
      toolCalls: [],
    });
    expect(readWorkersAiReply({ choices: [] })).toEqual({
      content: "",
      toolCalls: [],
    });
  });
});
