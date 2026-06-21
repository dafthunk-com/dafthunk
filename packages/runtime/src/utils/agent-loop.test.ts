import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../tool-types";
import {
  type AgentLoopConfig,
  type AgentMessage,
  type AgentToolCall,
  type LLMResponse,
  runAgentLoop,
} from "./agent-loop";

// ── Test helpers ───────────────────────────────────────────────────────────

/** A scripted LLM: returns queued responses in order, recording each call. */
function scriptedLLM(responses: LLMResponse[]) {
  let index = 0;
  const calls: { messages: AgentMessage[]; tools: ToolDefinition[] }[] = [];
  const fn = async (
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> => {
    calls.push({ messages: structuredClone(messages), tools });
    const response = responses[index];
    if (!response) {
      throw new Error(`scriptedLLM ran out of responses at call ${index}`);
    }
    index += 1;
    return response;
  };
  return { fn, calls, callCount: () => index };
}

function llmText(content: string, tokens = 0): LLMResponse {
  return { content, toolCalls: [], inputTokens: tokens, outputTokens: tokens };
}

function llmCalls(toolCalls: AgentToolCall[], content = ""): LLMResponse {
  return { content, toolCalls, inputTokens: 1, outputTokens: 1 };
}

function call(
  id: string,
  name: string,
  args: Record<string, unknown> = {}
): AgentToolCall {
  return { id, name, arguments: args };
}

function syncTool(
  name: string,
  fn: (args: Record<string, unknown>) => string = () => "ok"
): ToolDefinition {
  return {
    name,
    description: name,
    parameters: { type: "object", properties: {} },
    function: async (args) => fn(args as Record<string, unknown>),
  };
}

const isAsk = (name: string) => name === "ask";

// ── Backward compatibility ─────────────────────────────────────────────────

describe("runAgentLoop — completion (no suspending tools)", () => {
  it("runs a normal tool turn then completes", async () => {
    const llm = scriptedLLM([
      llmCalls([call("c1", "lookup")]),
      llmText("final answer"),
    ]);
    const config: AgentLoopConfig = {
      userMessage: "hi",
      tools: [syncTool("lookup", () => "looked up")],
      maxSteps: 5,
      callLLM: llm.fn,
    };

    const outcome = await runAgentLoop(config);

    expect(outcome.status).toBe("completed");
    if (outcome.status !== "completed") return;
    expect(outcome.text).toBe("final answer");
    expect(outcome.finishReason).toBe("completed");
    expect(outcome.totalSteps).toBe(1);
    expect(outcome.steps[0].toolResults[0].content).toBe("looked up");
  });

  it("completes immediately when the model calls no tools", async () => {
    const llm = scriptedLLM([llmText("done")]);
    const outcome = await runAgentLoop({
      userMessage: "hi",
      tools: [],
      maxSteps: 5,
      callLLM: llm.fn,
    });
    expect(outcome.status).toBe("completed");
    if (outcome.status !== "completed") return;
    expect(outcome.text).toBe("done");
    expect(outcome.totalSteps).toBe(0);
  });
});

// ── Suspend ─────────────────────────────────────────────────────────────────

describe("runAgentLoop — suspend", () => {
  it("suspends when a suspending tool is called and records no step yet", async () => {
    const llm = scriptedLLM([llmCalls([call("a1", "ask", { to: "alice" })])]);
    const outcome = await runAgentLoop({
      userMessage: "hi",
      tools: [],
      maxSteps: 5,
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    });

    expect(outcome.status).toBe("suspended");
    if (outcome.status !== "suspended") return;
    expect(outcome.pendingToolCalls).toHaveLength(1);
    expect(outcome.pendingToolCalls[0].id).toBe("a1");
    expect(outcome.pendingToolCalls[0].arguments).toEqual({ to: "alice" });
    // The suspending tool's function is never invoked.
    expect(llm.callCount()).toBe(1);
    // Step is deferred to resume; assistant message is in state.
    expect(outcome.state.steps).toHaveLength(0);
    const last = outcome.state.messages.at(-1);
    expect(last?.role).toBe("assistant");
    expect(last?.toolCalls?.[0].id).toBe("a1");
  });

  it("runs synchronous tools in a mixed turn but parks on the suspending one", async () => {
    let lookupRan = false;
    const llm = scriptedLLM([
      llmCalls([call("s1", "lookup"), call("a1", "ask", { to: "bob" })]),
    ]);
    const outcome = await runAgentLoop({
      userMessage: "hi",
      tools: [
        syncTool("lookup", () => {
          lookupRan = true;
          return "sync-result";
        }),
      ],
      maxSteps: 5,
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    });

    expect(outcome.status).toBe("suspended");
    if (outcome.status !== "suspended") return;
    expect(lookupRan).toBe(true);
    expect(outcome.pendingToolCalls.map((c) => c.id)).toEqual(["a1"]);
    // The sync tool result is already in the conversation, ready for resume.
    const toolMsgs = outcome.state.messages.filter((m) => m.role === "tool");
    expect(toolMsgs).toHaveLength(1);
    expect(toolMsgs[0].content).toBe("sync-result");
    expect(toolMsgs[0].toolCallId).toBe("s1");
  });

  it("collects a parallel fan-out of suspending calls", async () => {
    const llm = scriptedLLM([
      llmCalls([
        call("a1", "ask", { to: "alice" }),
        call("a2", "ask", { to: "bob" }),
        call("a3", "ask", { to: "carol" }),
      ]),
    ]);
    const outcome = await runAgentLoop({
      userMessage: "hi",
      tools: [],
      maxSteps: 5,
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    });

    expect(outcome.status).toBe("suspended");
    if (outcome.status !== "suspended") return;
    expect(outcome.pendingToolCalls.map((c) => c.id)).toEqual([
      "a1",
      "a2",
      "a3",
    ]);
  });
});

// ── Resume ───────────────────────────────────────────────────────────────────

describe("runAgentLoop — resume", () => {
  it("injects results, records the suspended step, and runs to completion", async () => {
    const llm = scriptedLLM([
      llmCalls([call("a1", "ask", { to: "alice" })]),
      llmText("all done"),
    ]);
    const shared = {
      maxSteps: 5,
      tools: [],
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    };

    const suspended = await runAgentLoop({ userMessage: "hi", ...shared });
    expect(suspended.status).toBe("suspended");
    if (suspended.status !== "suspended") return;

    const resumed = await runAgentLoop({
      userMessage: "hi",
      ...shared,
      resumeState: suspended.state,
      resumeToolResults: [
        { toolCallId: "a1", toolName: "ask", content: "alice says yes" },
      ],
    });

    expect(resumed.status).toBe("completed");
    if (resumed.status !== "completed") return;
    expect(resumed.text).toBe("all done");
    expect(resumed.totalSteps).toBe(1);
    // The recorded step carries the resolved async result.
    expect(resumed.steps[0].toolResults).toHaveLength(1);
    expect(resumed.steps[0].toolResults[0].content).toBe("alice says yes");
    expect(resumed.steps[0].toolResults[0].toolCallId).toBe("a1");
    // The follow-up LLM call saw the injected tool result.
    const lastCall = llm.calls.at(-1);
    expect(lastCall?.messages.at(-1)?.content).toBe("alice says yes");
  });

  it("records sync + async results together for a mixed suspended turn", async () => {
    const llm = scriptedLLM([
      llmCalls([call("s1", "lookup"), call("a1", "ask")]),
      llmText("done"),
    ]);
    const shared = {
      maxSteps: 5,
      tools: [syncTool("lookup", () => "sync")],
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    };

    const suspended = await runAgentLoop({ userMessage: "hi", ...shared });
    if (suspended.status !== "suspended") throw new Error("expected suspend");

    const resumed = await runAgentLoop({
      userMessage: "hi",
      ...shared,
      resumeState: suspended.state,
      resumeToolResults: [
        { toolCallId: "a1", toolName: "ask", content: "async" },
      ],
    });

    if (resumed.status !== "completed") throw new Error("expected completion");
    expect(resumed.steps[0].toolResults.map((r) => r.content)).toEqual([
      "sync",
      "async",
    ]);
  });

  it("resumes a parallel fan-out with one reply and one timeout sentinel", async () => {
    const llm = scriptedLLM([
      llmCalls([
        call("a1", "ask", { to: "alice" }),
        call("a2", "ask", { to: "bob" }),
      ]),
      llmText("summary"),
    ]);
    const shared = {
      maxSteps: 5,
      tools: [],
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    };

    const suspended = await runAgentLoop({ userMessage: "hi", ...shared });
    if (suspended.status !== "suspended") throw new Error("expected suspend");

    const resumed = await runAgentLoop({
      userMessage: "hi",
      ...shared,
      resumeState: suspended.state,
      resumeToolResults: [
        { toolCallId: "a1", toolName: "ask", content: "alice replied" },
        { toolCallId: "a2", toolName: "ask", content: "(no reply received)" },
      ],
    });

    if (resumed.status !== "completed") throw new Error("expected completion");
    expect(resumed.text).toBe("summary");
    expect(resumed.steps[0].toolResults.map((r) => r.content)).toEqual([
      "alice replied",
      "(no reply received)",
    ]);
  });

  it("supports multiple suspend/resume cycles", async () => {
    const llm = scriptedLLM([
      llmCalls([call("a1", "ask")]), // turn 1 -> suspend
      llmCalls([call("a2", "ask")]), // turn 2 -> suspend again
      llmText("finished"), // turn 3 -> complete
    ]);
    const shared = {
      maxSteps: 10,
      tools: [],
      callLLM: llm.fn,
      isSuspendingTool: isAsk,
    };

    const s1 = await runAgentLoop({ userMessage: "hi", ...shared });
    if (s1.status !== "suspended") throw new Error("expected suspend 1");

    const s2 = await runAgentLoop({
      userMessage: "hi",
      ...shared,
      resumeState: s1.state,
      resumeToolResults: [{ toolCallId: "a1", toolName: "ask", content: "r1" }],
    });
    if (s2.status !== "suspended") throw new Error("expected suspend 2");

    const done = await runAgentLoop({
      userMessage: "hi",
      ...shared,
      resumeState: s2.state,
      resumeToolResults: [{ toolCallId: "a2", toolName: "ask", content: "r2" }],
    });

    if (done.status !== "completed") throw new Error("expected completion");
    expect(done.text).toBe("finished");
    expect(done.totalSteps).toBe(2);
    expect(done.steps.map((s) => s.toolResults[0].content)).toEqual([
      "r1",
      "r2",
    ]);
  });

  it("throws when resuming without a suspended assistant turn", async () => {
    const llm = scriptedLLM([llmText("unused")]);
    await expect(
      runAgentLoop({
        userMessage: "hi",
        tools: [],
        maxSteps: 5,
        callLLM: llm.fn,
        isSuspendingTool: isAsk,
        resumeState: {
          messages: [{ role: "user", content: "hi" }],
          steps: [],
          totalInputTokens: 0,
          totalOutputTokens: 0,
        },
        resumeToolResults: [
          { toolCallId: "x", toolName: "ask", content: "orphan" },
        ],
      })
    ).rejects.toThrow(/no suspended assistant turn/);
  });
});
