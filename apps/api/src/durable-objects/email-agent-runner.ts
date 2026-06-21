/**
 * EmailAgentRunner Durable Object
 *
 * Drives an agent that pursues a goal by emailing one or more interlocutors and
 * waiting — for days if needed — for their replies. The workflow node parks once
 * on `email-agent-complete-${nodeId}` with a long timeout; this DO owns the
 * multi-turn conversation in between.
 *
 * The agent's `ask_interlocutor` tool is a *suspending* tool (see
 * {@link runAgentLoop}). When the model calls it — possibly several times in one
 * turn, to question multiple interlocutors in parallel — the loop parks and this
 * DO sends the emails, registers each thread for reply routing, and sets an
 * alarm per reply deadline. Replies arrive via {@link deliverReply}; once every
 * outstanding ask in the turn is settled (replied or timed out) the loop
 * resumes. When the agent stops calling tools (goal reached) or hits the round
 * limit, the DO sends the completion event and the workflow continues.
 */

import { DurableObject } from "cloudflare:workers";
import type { ToolDefinition, ToolReference } from "@dafthunk/runtime";
import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type {
  AgentLoopState,
  AgentMessage,
  FinishReason,
  ResolvedToolResult,
} from "@dafthunk/runtime/utils/agent-loop";
import { runAgentLoop } from "@dafthunk/runtime/utils/agent-loop";
import type { TokenPricing } from "@dafthunk/runtime/utils/usage";
import { calculateTokenUsage } from "@dafthunk/runtime/utils/usage";

import type { Bindings } from "../context";
import { createDatabase, getEmail } from "../db";
import { CloudflareMailboxService } from "../runtime/cloudflare-mailbox-service";
import { callAgentLLM } from "./agent-llm";
import {
  applyCodeMode,
  buildNodeToolProvider,
  resolveTools,
  toJsonSchema,
} from "./agent-services";
import {
  allSettled,
  nextWaitingDeadline,
  type PendingAsk,
  settleExpired,
  settleReply,
  toResumeResults,
} from "./email-agent-barrier";
import type { MailboxMessageRow } from "./mailbox-do";

const ASK_TOOL = "ask_interlocutor";
const NO_REPLY_SENTINEL = "(no reply received before the deadline)";

// ── Request type ─────────────────────────────────────────────────────────────

export interface EmailInterlocutor {
  /** Stable id the agent uses to address this interlocutor. */
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface EmailAgentRunRequest {
  /** Unique run id — DO instance name, `${executionId}:${nodeId}`. */
  runId: string;
  executionInstanceId: string;
  nodeId: string;
  provider: AgentProvider;
  model: string;
  pricing?: TokenPricing;
  organizationId: string;
  /** Id of the org email to send from; resolved to its address by the platform. */
  fromEmailId: string;
  interlocutors: EmailInterlocutor[];
  /** The goal the agent should pursue. */
  objective: string;
  /** Persona / behavioural system prompt. */
  instructions?: string;
  /** Initial material/context for the agent. */
  context?: string;
  /** Default subject for newly opened threads. */
  subject?: string;
  /** Max conversation rounds (fan-out turns) before forced wrap-up. */
  maxRounds: number;
  /** How long to wait for each reply before filling a timeout sentinel. */
  replyTimeoutMs: number;
  /** Extra synchronous tools the agent may call between emails. */
  tools?: ToolReference[];
  /** Schema constraining the final result (structured output). */
  schema?: Record<string, unknown>;
}

// ── Internal persisted shapes ────────────────────────────────────────────────

interface ThreadRef {
  threadId: string;
  subject: string;
}

/** One interlocutor's thread, sourced from the mailbox at completion. */
interface TranscriptThread {
  interlocutorId: string;
  threadId: string;
  /** True when the interlocutor never replied before the deadline. */
  timedOut: boolean;
  messages: MailboxMessageRow[];
}

type RunStatus = "running" | "waiting" | "completed" | "error";

// ── Durable Object ───────────────────────────────────────────────────────────

export class EmailAgentRunner extends DurableObject<Bindings> {
  private get storage(): DurableObjectStorage {
    return this.ctx.storage;
  }

  // ── Public RPC ─────────────────────────────────────────────────────────

  /**
   * HTTP entry used by the workflow node (which lives in a package that can't
   * import this DO's types, so it calls over `stub.fetch` rather than RPC).
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/start") && request.method === "POST") {
      const body = (await request.json()) as EmailAgentRunRequest;
      return Response.json(await this.start(body));
    }
    return new Response("Not found", { status: 404 });
  }

  /**
   * Begin a run. Idempotent: if the run already completed, re-sends the
   * completion event (in case the prior send was lost) and returns.
   */
  async start(request: EmailAgentRunRequest): Promise<{ status: string }> {
    const status = await this.storage.get<RunStatus>("status");

    if (status === "completed") {
      const cached = await this.storage.get<EmailCompletion>("completion");
      if (cached) {
        await this.sendCompletionEvent(request, cached);
      }
      return { status: "completed" };
    }
    if (status === "running" || status === "waiting") {
      return { status };
    }

    // Resolve the sending address up-front so a misconfiguration fails fast.
    const db = createDatabase(this.env.DB);
    const email = await getEmail(
      db,
      request.fromEmailId,
      request.organizationId
    );
    if (!email) {
      await this.fail(
        request,
        `Sending address '${request.fromEmailId}' not found for this organization`
      );
      return { status: "error" };
    }

    await this.storage.put("request", request);
    await this.storage.put("emailId", email.id);
    await this.storage.put("status", "running" satisfies RunStatus);

    // Run the first turn in the background so the RPC returns promptly.
    this.ctx.waitUntil(this.runLoop());
    return { status: "started" };
  }

  /**
   * Deliver an inbound reply for one of the threads this run is waiting on.
   * Called by the inbound-mail handler. Returns whether the reply matched a
   * pending ask (false → fall through to normal handling).
   */
  async deliverReply(args: {
    threadId: string;
    text: string;
  }): Promise<{ accepted: boolean }> {
    const pending = (await this.storage.get<PendingAsk[]>("pending")) ?? [];
    if (!settleReply(pending, args.threadId, args.text)) {
      return { accepted: false };
    }

    await this.storage.put("pending", pending);

    if (allSettled(pending)) {
      await this.storage.deleteAlarm();
      this.ctx.waitUntil(this.resumeFromPending(pending));
    }
    return { accepted: true };
  }

  /** Per-reply deadline: settle expired asks with a sentinel, then maybe resume. */
  async alarm(): Promise<void> {
    const pending = (await this.storage.get<PendingAsk[]>("pending")) ?? [];
    if (pending.length === 0) return;

    const expired = settleExpired(pending, Date.now(), NO_REPLY_SENTINEL);
    if (expired.length > 0) {
      await this.storage.put("pending", pending);
      await this.markTimedOut(expired.map((p) => p.threadId));
    }

    if (allSettled(pending)) {
      this.ctx.waitUntil(this.resumeFromPending(pending));
    } else {
      const next = nextWaitingDeadline(pending);
      if (next !== undefined) await this.storage.setAlarm(next);
    }
  }

  // ── Loop driver ──────────────────────────────────────────────────────────

  /** Run the agent loop forward until it suspends on asks or completes. */
  private async runLoop(resume?: ResolvedToolResult[]): Promise<void> {
    const request = await this.storage.get<EmailAgentRunRequest>("request");
    if (!request) return;

    try {
      const state = await this.storage.get<AgentLoopState>("state");
      const tools = await this.buildTools(request);
      const jsonSchema = toJsonSchema(request.schema);
      const instructions = this.systemPrompt(request);

      const llm = (
        messages: AgentMessage[],
        llmTools: ToolDefinition[],
        schema?: Record<string, unknown>
      ) =>
        callAgentLLM(this.env, {
          provider: request.provider,
          model: request.model,
          instructions,
          messages,
          tools: llmTools,
          schema,
        });

      const callLLM = (messages: AgentMessage[], llmTools: ToolDefinition[]) =>
        llm(messages, llmTools);

      const callFinalLLM = jsonSchema
        ? (messages: AgentMessage[], llmTools: ToolDefinition[]) =>
            llm(messages, llmTools, jsonSchema)
        : undefined;

      const outcome = await runAgentLoop({
        userMessage: this.userMessage(request),
        tools,
        maxSteps: Math.max(1, request.maxRounds),
        callLLM,
        callFinalLLM,
        isSuspendingTool: (name) => name === ASK_TOOL,
        ...(state ? { resumeState: state } : {}),
        ...(resume ? { resumeToolResults: resume } : {}),
      });

      if (outcome.status === "suspended") {
        await this.storage.put("state", outcome.state);
        await this.parkOnAsks(request, outcome.pendingToolCalls);
        return;
      }

      // Completed (goal reached or round limit).
      const finishReason = FINISH_REASON[outcome.finishReason];

      const usage = request.pricing
        ? calculateTokenUsage(
            outcome.totalInputTokens,
            outcome.totalOutputTokens,
            request.pricing
          )
        : 1;

      const completion: EmailCompletion = {
        result: outcome.text,
        transcript: await this.buildTranscript(request),
        rounds: outcome.totalSteps,
        finishReason,
        totalInputTokens: outcome.totalInputTokens,
        totalOutputTokens: outcome.totalOutputTokens,
        usage,
        ...(finishReason === "error" ? { error: outcome.text } : {}),
      };

      await this.complete(request, completion);
    } catch (error) {
      console.error("EmailAgentRunner runLoop error:", error);
      await this.fail(
        request,
        error instanceof Error ? error.message : "Email agent failed"
      );
    }
  }

  /**
   * Send the emails for a fan-out of `ask_interlocutor` calls and park the run.
   * Asks that can't be resolved/sent settle immediately with an error so the
   * barrier still completes; if none remain waiting, resume right away.
   */
  private async parkOnAsks(
    request: EmailAgentRunRequest,
    asks: { id: string; name: string; arguments: Record<string, unknown> }[]
  ): Promise<void> {
    const mailbox = new CloudflareMailboxService(this.env);
    const mailboxStub = this.mailboxStub(request.organizationId);
    const emailId = (await this.storage.get<string>("emailId")) ?? "";
    const threads =
      (await this.storage.get<Record<string, ThreadRef>>("threads")) ?? {};

    const deadline = Date.now() + request.replyTimeoutMs;
    const pending: PendingAsk[] = [];

    for (const ask of asks) {
      const interlocutorId = String(ask.arguments.interlocutor ?? "");
      const message = String(ask.arguments.message ?? "");
      const who = resolveInterlocutor(request.interlocutors, interlocutorId);

      if (!who || !message) {
        pending.push({
          toolCallId: ask.id,
          interlocutorId,
          threadId: "",
          deadline,
          status: "settled",
          result: who
            ? "(no message provided)"
            : `(unknown interlocutor '${interlocutorId}')`,
        });
        continue;
      }

      const existing = threads[who.id];
      const subject = existing
        ? `Re: ${existing.subject.replace(/^re:\s*/i, "")}`
        : (ask.arguments.subject as string) ||
          request.subject ||
          `Regarding: ${request.objective.slice(0, 60)}`;

      try {
        const sent = await mailbox.sendThreaded({
          organizationId: request.organizationId,
          emailId,
          to: who.email,
          subject,
          text: message,
          ...(existing ? { threadId: existing.threadId } : {}),
        });

        threads[who.id] = {
          threadId: sent.threadId,
          subject: existing?.subject ?? subject,
        };
        // Tag the mailbox thread so its replies route back to this run.
        await mailboxStub.setThreadAgentRun(sent.threadId, request.runId);
        pending.push({
          toolCallId: ask.id,
          interlocutorId: who.id,
          threadId: sent.threadId,
          deadline,
          status: "waiting",
        });
      } catch (error) {
        pending.push({
          toolCallId: ask.id,
          interlocutorId: who.id,
          threadId: "",
          deadline,
          status: "settled",
          result: `(failed to send: ${
            error instanceof Error ? error.message : "unknown error"
          })`,
        });
      }
    }

    await this.storage.put("threads", threads);
    await this.storage.put("pending", pending);
    await this.storage.put("status", "waiting" satisfies RunStatus);

    if (allSettled(pending)) {
      // Nothing to wait for (all failed/invalid) — resume immediately.
      this.ctx.waitUntil(this.resumeFromPending(pending));
    } else {
      await this.storage.setAlarm(deadline);
    }
  }

  /** Build resume results from settled asks and continue the loop. */
  private async resumeFromPending(pending: PendingAsk[]): Promise<void> {
    const resume = toResumeResults(pending, ASK_TOOL, NO_REPLY_SENTINEL);
    await this.storage.delete("pending");
    await this.storage.put("status", "running" satisfies RunStatus);
    await this.runLoop(resume);
  }

  // ── Completion / failure ─────────────────────────────────────────────────

  private async complete(
    request: EmailAgentRunRequest,
    completion: EmailCompletion
  ): Promise<void> {
    await this.storage.put("completion", completion);
    await this.storage.put("status", "completed" satisfies RunStatus);
    await this.releaseThreads(request.organizationId);
    await this.sendCompletionEvent(request, completion);
  }

  private async fail(
    request: EmailAgentRunRequest,
    message: string
  ): Promise<void> {
    await this.storage.put("status", "error" satisfies RunStatus);
    try {
      await this.releaseThreads(request.organizationId);
    } catch {
      // best-effort
    }
    try {
      const instance = await this.env.EXECUTE.get(request.executionInstanceId);
      await instance.sendEvent({
        type: `email-agent-complete-${request.nodeId}`,
        payload: { outputs: {}, usage: 0, error: message },
      });
    } catch (error) {
      console.error("EmailAgentRunner failed to send error event:", error);
    }
  }

  private async sendCompletionEvent(
    request: EmailAgentRunRequest,
    completion: EmailCompletion
  ): Promise<void> {
    const instance = await this.env.EXECUTE.get(request.executionInstanceId);
    await instance.sendEvent({
      type: `email-agent-complete-${request.nodeId}`,
      payload: {
        outputs: {
          result: completion.result,
          transcript: completion.transcript,
          rounds: completion.rounds,
          finish_reason: completion.finishReason,
          usage_metadata: {
            totalInputTokens: completion.totalInputTokens,
            totalOutputTokens: completion.totalOutputTokens,
          },
        },
        usage: completion.usage,
        ...(completion.error ? { error: completion.error } : {}),
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async buildTools(
    request: EmailAgentRunRequest
  ): Promise<ToolDefinition[]> {
    const askTool: ToolDefinition = {
      name: ASK_TOOL,
      description:
        "Email a specific interlocutor and wait for their reply. Issue multiple " +
        "calls in one turn to ask several interlocutors in parallel.",
      parameters: {
        type: "object",
        properties: {
          interlocutor: {
            type: "string",
            enum: request.interlocutors.map((i) => i.id),
            description: "Id of the interlocutor to email",
          },
          message: {
            type: "string",
            description: "The email body to send (plain text)",
          },
          subject: {
            type: "string",
            description: "Optional subject for a new thread",
          },
        },
        required: ["interlocutor", "message"],
      },
      // Never invoked: suspending tools are intercepted by the loop.
      function: async () => NO_REPLY_SENTINEL,
    };

    const userTools = request.tools?.length
      ? applyCodeMode(
          this.env,
          await resolveTools(
            request.tools,
            await buildNodeToolProvider(this.env, request.organizationId)
          ),
          false
        )
      : [];

    return [askTool, ...userTools];
  }

  private systemPrompt(request: EmailAgentRunRequest): string {
    const roster = request.interlocutors
      .map((i) => {
        const bits = [i.role && `role=${i.role}`, i.name && `name=${i.name}`]
          .filter(Boolean)
          .join(", ");
        return `- id=${i.id}${bits ? ` (${bits})` : ""}`;
      })
      .join("\n");

    const persona = request.instructions?.trim();
    return [
      persona,
      "You coordinate with interlocutors over email to accomplish the objective. " +
        `Use the ${ASK_TOOL} tool to email an interlocutor and wait for their reply. ` +
        "You may contact several interlocutors in parallel by issuing multiple " +
        `${ASK_TOOL} calls in a single turn. A reply of "${NO_REPLY_SENTINEL}" ` +
        "means that interlocutor did not respond in time — decide how to proceed. " +
        "When you have achieved the objective, stop calling tools and give your final result.",
      `Interlocutors you may contact:\n${roster}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  private userMessage(request: EmailAgentRunRequest): string {
    return request.context
      ? `Objective:\n${request.objective}\n\nContext:\n${request.context}`
      : `Objective:\n${request.objective}`;
  }

  private mailboxStub(organizationId: string) {
    return this.env.MAILBOX.get(
      this.env.MAILBOX.idFromName(`mailbox:${organizationId}`)
    );
  }

  /** Record thread ids whose interlocutor never replied before the deadline. */
  private async markTimedOut(threadIds: string[]): Promise<void> {
    const timedOut = (await this.storage.get<string[]>("timedOut")) ?? [];
    timedOut.push(...threadIds);
    await this.storage.put("timedOut", timedOut);
  }

  /** Release mailbox-thread ownership so late replies fall through to triggers. */
  private async releaseThreads(organizationId: string): Promise<void> {
    const threads =
      (await this.storage.get<Record<string, ThreadRef>>("threads")) ?? {};
    const stub = this.mailboxStub(organizationId);
    await Promise.all(
      Object.values(threads).map((ref) =>
        stub.setThreadAgentRun(ref.threadId, null)
      )
    );
  }

  /**
   * Assemble the conversation transcript from the mailbox — the system of record
   * for every sent message and reply — one entry per interlocutor thread.
   */
  private async buildTranscript(
    request: EmailAgentRunRequest
  ): Promise<TranscriptThread[]> {
    const threads =
      (await this.storage.get<Record<string, ThreadRef>>("threads")) ?? {};
    const timedOut = new Set(
      (await this.storage.get<string[]>("timedOut")) ?? []
    );
    const stub = this.mailboxStub(request.organizationId);

    return Promise.all(
      Object.entries(threads).map(async ([interlocutorId, ref]) => ({
        interlocutorId,
        threadId: ref.threadId,
        timedOut: timedOut.has(ref.threadId),
        messages: await stub.listThreadMessages(ref.threadId),
      }))
    );
  }
}

interface EmailCompletion {
  result: string;
  transcript: TranscriptThread[];
  rounds: number;
  finishReason: "goal_reached" | "max_rounds" | "error";
  totalInputTokens: number;
  totalOutputTokens: number;
  usage: number;
  error?: string;
}

/** Maps the agent loop's finish reason onto the email completion's vocabulary. */
const FINISH_REASON: Record<FinishReason, EmailCompletion["finishReason"]> = {
  completed: "goal_reached",
  max_steps_reached: "max_rounds",
  error: "error",
};

function resolveInterlocutor(
  interlocutors: EmailInterlocutor[],
  ref: string
): EmailInterlocutor | undefined {
  const needle = ref.trim().toLowerCase();
  return (
    interlocutors.find((i) => i.id.toLowerCase() === needle) ??
    interlocutors.find((i) => i.email.toLowerCase() === needle) ??
    interlocutors.find((i) => i.name?.toLowerCase() === needle)
  );
}
