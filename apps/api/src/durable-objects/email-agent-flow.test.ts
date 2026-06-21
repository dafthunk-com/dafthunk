/**
 * Integration test for the email-agent conversation flow.
 *
 * Drives the *real* agent loop ({@link runAgentLoop}) and the *real* barrier
 * helpers through a small harness that mirrors EmailAgentRunner's orchestration,
 * stubbing only the I/O (the LLM and email sending). This exercises the path
 * that matters: a parallel fan-out of questions parks the loop; replies and
 * deadline timeouts settle the barrier; once complete the loop resumes with the
 * collected results and runs to completion.
 */

import type { ToolDefinition } from "@dafthunk/runtime";
import type {
  AgentLoopState,
  AgentMessage,
  AgentToolCall,
  LLMResponse,
} from "@dafthunk/runtime/utils/agent-loop";
import { runAgentLoop } from "@dafthunk/runtime/utils/agent-loop";
import { describe, expect, it } from "vitest";

import {
  allSettled,
  type PendingAsk,
  settleExpired,
  settleReply,
  toResumeResults,
} from "./email-agent-barrier";

const ASK = "ask_interlocutor";
const SENTINEL = "(no reply received before the deadline)";
const TIMEOUT = 1000;

interface Interlocutor {
  id: string;
  email: string;
}

interface Exchange {
  interlocutorId: string;
  threadId: string;
  message: string;
  reply?: string;
  timedOut?: boolean;
}

interface SentEmail {
  to: string;
  text: string;
  threadId: string;
}

/** Harness mirroring EmailAgentRunner's drive loop with stubbed I/O. */
class EmailAgentHarness {
  state?: AgentLoopState;
  pending: PendingAsk[] = [];
  exchanges: Exchange[] = [];
  outbox: SentEmail[] = [];
  completion?: {
    result: string;
    finishReason: string;
    rounds: number;
    transcript: Exchange[];
  };
  private threadSeq = 0;

  constructor(
    private readonly cfg: {
      objective: string;
      interlocutors: Interlocutor[];
      maxRounds: number;
      callLLM: (
        messages: AgentMessage[],
        tools: ToolDefinition[]
      ) => Promise<LLMResponse>;
    }
  ) {}

  private askTool(): ToolDefinition {
    return {
      name: ASK,
      description: "Email an interlocutor and wait for their reply.",
      parameters: { type: "object", properties: {} },
      function: async () => SENTINEL, // never invoked (suspending)
    };
  }

  async start(): Promise<void> {
    await this.runLoop();
  }

  private async runLoop(resume?: ReturnType<typeof toResumeResults>) {
    const outcome = await runAgentLoop({
      userMessage: this.cfg.objective,
      tools: [this.askTool()],
      maxSteps: this.cfg.maxRounds,
      callLLM: this.cfg.callLLM,
      isSuspendingTool: (n) => n === ASK,
      ...(this.state ? { resumeState: this.state } : {}),
      ...(resume ? { resumeToolResults: resume } : {}),
    });

    if (outcome.status === "suspended") {
      this.state = outcome.state;
      this.parkOnAsks(outcome.pendingToolCalls);
      return;
    }

    this.completion = {
      result: outcome.text,
      finishReason:
        outcome.finishReason === "max_steps_reached"
          ? "max_rounds"
          : outcome.finishReason === "error"
            ? "error"
            : "goal_reached",
      rounds: outcome.totalSteps,
      transcript: this.exchanges,
    };
  }

  private parkOnAsks(asks: AgentToolCall[]): void {
    for (const a of asks) {
      const who = this.cfg.interlocutors.find(
        (i) => i.id === String(a.arguments.interlocutor)
      );
      if (!who) {
        this.pending.push({
          toolCallId: a.id,
          interlocutorId: String(a.arguments.interlocutor),
          threadId: "",
          deadline: TIMEOUT,
          status: "settled",
          result: "(unknown interlocutor)",
        });
        continue;
      }
      const threadId = `thread-${++this.threadSeq}`;
      const message = String(a.arguments.message);
      this.outbox.push({ to: who.email, text: message, threadId });
      this.exchanges.push({ interlocutorId: who.id, threadId, message });
      this.pending.push({
        toolCallId: a.id,
        interlocutorId: who.id,
        threadId,
        deadline: TIMEOUT,
        status: "waiting",
      });
    }
  }

  /** Simulate an inbound reply on a thread (mirrors DO.deliverReply). */
  async deliverReply(threadId: string, text: string): Promise<boolean> {
    if (!settleReply(this.pending, threadId, text)) return false;
    this.recordReply(threadId, text, false);
    if (allSettled(this.pending)) await this.resume();
    return true;
  }

  /** Simulate the per-reply deadline firing (mirrors DO.alarm). */
  async fireTimeout(now: number): Promise<void> {
    const expired = settleExpired(this.pending, now, SENTINEL);
    for (const p of expired) this.recordReply(p.threadId, SENTINEL, true);
    if (allSettled(this.pending)) await this.resume();
  }

  private async resume(): Promise<void> {
    const resume = toResumeResults(this.pending, ASK, SENTINEL);
    this.pending = [];
    await this.runLoop(resume);
  }

  private recordReply(
    threadId: string,
    reply: string,
    timedOut: boolean
  ): void {
    for (let i = this.exchanges.length - 1; i >= 0; i--) {
      const e = this.exchanges[i];
      if (e.threadId === threadId && e.reply === undefined) {
        e.reply = reply;
        if (timedOut) e.timedOut = true;
        return;
      }
    }
  }
}

// ── Scripted LLM helpers ─────────────────────────────────────────────────────

function call(
  id: string,
  interlocutor: string,
  message: string
): AgentToolCall {
  return { id, name: ASK, arguments: { interlocutor, message } };
}

function scripted(responses: LLMResponse[]) {
  let i = 0;
  const seen: AgentMessage[][] = [];
  const fn = async (messages: AgentMessage[]): Promise<LLMResponse> => {
    seen.push(structuredClone(messages));
    const r = responses[i];
    if (!r) throw new Error(`LLM out of script at call ${i}`);
    i += 1;
    return r;
  };
  return { fn, seen };
}

const INTERLOCUTORS: Interlocutor[] = [
  { id: "alice", email: "alice@example.com" },
  { id: "bob", email: "bob@example.com" },
];

describe("email agent flow (loop + barrier integration)", () => {
  it("fans out to two interlocutors; one replies, one times out, then completes", async () => {
    const llm = scripted([
      // Turn 1: ask both in parallel.
      {
        content: "",
        toolCalls: [
          call("c-alice", "alice", "Are you available Tuesday?"),
          call("c-bob", "bob", "Are you available Tuesday?"),
        ],
        inputTokens: 10,
        outputTokens: 5,
      },
      // Turn 2 (after barrier): wrap up.
      {
        content: "Scheduled with Alice for Tuesday.",
        toolCalls: [],
        inputTokens: 8,
        outputTokens: 4,
      },
    ]);

    const agent = new EmailAgentHarness({
      objective: "Find a meeting time",
      interlocutors: INTERLOCUTORS,
      maxRounds: 10,
      callLLM: llm.fn,
    });

    await agent.start();

    // Parked on the fan-out: two emails sent, two asks waiting, no completion.
    expect(agent.outbox.map((e) => e.to)).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
    expect(agent.pending).toHaveLength(2);
    expect(agent.completion).toBeUndefined();

    // Alice replies — barrier not yet complete (Bob still outstanding).
    const aliceThread = agent.outbox[0].threadId;
    expect(await agent.deliverReply(aliceThread, "Yes, Tuesday works")).toBe(
      true
    );
    expect(agent.completion).toBeUndefined();

    // Bob's deadline passes — barrier completes and the loop resumes.
    await agent.fireTimeout(TIMEOUT);

    expect(agent.completion).toBeDefined();
    expect(agent.completion?.finishReason).toBe("goal_reached");
    expect(agent.completion?.result).toBe("Scheduled with Alice for Tuesday.");
    expect(agent.completion?.rounds).toBe(1);

    // Transcript captures both exchanges, including the timeout sentinel.
    const transcript = agent.completion!.transcript;
    expect(transcript).toHaveLength(2);
    expect(transcript[0]).toMatchObject({
      interlocutorId: "alice",
      reply: "Yes, Tuesday works",
    });
    expect(transcript[0].timedOut).toBeUndefined();
    expect(transcript[1]).toMatchObject({
      interlocutorId: "bob",
      reply: SENTINEL,
      timedOut: true,
    });

    // The resumed turn saw both tool results (reply + sentinel).
    const resumeMessages = llm.seen[1];
    const toolContents = resumeMessages
      .filter((m) => m.role === "tool")
      .map((m) => m.content);
    expect(toolContents).toContain("Yes, Tuesday works");
    expect(toolContents).toContain(SENTINEL);
  });

  it("resumes as soon as the last reply arrives (no timeout needed)", async () => {
    const llm = scripted([
      {
        content: "",
        toolCalls: [
          call("c-alice", "alice", "ping"),
          call("c-bob", "bob", "ping"),
        ],
        inputTokens: 1,
        outputTokens: 1,
      },
      { content: "Done.", toolCalls: [], inputTokens: 1, outputTokens: 1 },
    ]);
    const agent = new EmailAgentHarness({
      objective: "Collect two answers",
      interlocutors: INTERLOCUTORS,
      maxRounds: 10,
      callLLM: llm.fn,
    });

    await agent.start();
    await agent.deliverReply(agent.outbox[0].threadId, "a");
    expect(agent.completion).toBeUndefined(); // still waiting on Bob
    await agent.deliverReply(agent.outbox[1].threadId, "b");

    expect(agent.completion?.finishReason).toBe("goal_reached");
    expect(agent.completion?.result).toBe("Done.");
  });

  it("ignores a reply on an unknown thread", async () => {
    const llm = scripted([
      {
        content: "",
        toolCalls: [call("c-alice", "alice", "ping")],
        inputTokens: 1,
        outputTokens: 1,
      },
      { content: "ok", toolCalls: [], inputTokens: 1, outputTokens: 1 },
    ]);
    const agent = new EmailAgentHarness({
      objective: "x",
      interlocutors: INTERLOCUTORS,
      maxRounds: 10,
      callLLM: llm.fn,
    });

    await agent.start();
    expect(await agent.deliverReply("does-not-exist", "hi")).toBe(false);
    expect(agent.completion).toBeUndefined();

    // The real reply still resumes and completes.
    expect(await agent.deliverReply(agent.outbox[0].threadId, "hi")).toBe(true);
    expect(agent.completion?.result).toBe("ok");
  });

  it("spans multiple rounds: follow up after the first answers", async () => {
    const llm = scripted([
      // Round 1: ask alice.
      {
        content: "",
        toolCalls: [call("c1", "alice", "first?")],
        inputTokens: 1,
        outputTokens: 1,
      },
      // Round 2: follow up with bob after alice answers.
      {
        content: "",
        toolCalls: [call("c2", "bob", "second?")],
        inputTokens: 1,
        outputTokens: 1,
      },
      // Round 3: finish.
      { content: "All set.", toolCalls: [], inputTokens: 1, outputTokens: 1 },
    ]);
    const agent = new EmailAgentHarness({
      objective: "two-step",
      interlocutors: INTERLOCUTORS,
      maxRounds: 10,
      callLLM: llm.fn,
    });

    await agent.start();
    await agent.deliverReply(agent.outbox[0].threadId, "alice says hi");
    expect(agent.completion).toBeUndefined(); // now parked on bob
    expect(agent.outbox).toHaveLength(2);

    await agent.deliverReply(agent.outbox[1].threadId, "bob says hi");
    expect(agent.completion?.result).toBe("All set.");
    expect(agent.completion?.rounds).toBe(2);
  });
});
