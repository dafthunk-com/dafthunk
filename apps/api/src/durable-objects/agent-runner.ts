/**
 * AgentRunner Durable Object
 *
 * Runs a multi-turn agent loop (LLM → tools → LLM → …) with persistent
 * state in SQLite. If a Workflow step re-executes after an engine restart,
 * the DO returns its cached result instantly (idempotent).
 *
 * Supports four LLM providers: anthropic, google, openai, workers-ai.
 */

import type { ToolDefinition, ToolReference } from "@dafthunk/runtime";
import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type {
  AgentLoopResult,
  AgentLoopState,
  AgentMessage,
  LLMResponse,
} from "@dafthunk/runtime/utils/agent-loop";
import { runAgentLoop } from "@dafthunk/runtime/utils/agent-loop";
import type { TokenPricing } from "@dafthunk/runtime/utils/usage";
import { calculateTokenUsage } from "@dafthunk/runtime/utils/usage";
import { Agent } from "agents";

import type { Bindings } from "../context";
import { callAgentLLM } from "./agent-llm";
import {
  applyCodeMode,
  buildNodeToolProvider,
  resolveTools,
  toJsonSchema,
} from "./agent-services";

// ── Request / Response types ─────────────────────────────────────────────

export interface AgentRunRequest {
  /** Unique run ID — used for idempotency */
  runId: string;
  /** Workflow execution instance ID (for async /start mode) */
  executionInstanceId?: string;
  /** Node ID within the workflow (for async event routing) */
  nodeId?: string;
  provider: AgentProvider;
  model: string;
  /** Token pricing for usage calculation (for async /start mode) */
  pricing?: TokenPricing;
  instructions: string;
  /** Optional context text from upstream workflow nodes */
  context?: string;
  input: string;
  maxSteps: number;
  /** Tool references the agent can call */
  tools: ToolReference[];
  /** Enable code mode for multi-tool orchestration */
  codeMode?: boolean;
  /** Enable Google Search grounding (Gemini only) */
  googleSearch?: boolean;
  /** Organization ID for credential access (integrations, secrets) */
  organizationId: string;
  /** When set, routes to a persistent DO that maintains state across runs */
  agentId?: string;
  /** Max number of previous messages to load from conversation history */
  maxHistory?: number;
  /** Schema to constrain the final output format (structured JSON output) */
  schema?: Record<string, unknown>;
}

export interface AgentRunResponse {
  text: string;
  steps: AgentLoopResult["steps"];
  finishReason: AgentLoopResult["finishReason"];
  totalSteps: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  /** Full message history (only present when agentId is set) */
  agentMessages?: AgentMessage[];
}

// ── Persistent state for stateful conversations ─────────────────────────

export interface AgentRunnerState {
  messages: AgentMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ── Durable Object ───────────────────────────────────────────────────────

export class AgentRunner extends Agent<Bindings, AgentRunnerState> {
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/run") && request.method === "POST") {
      return this.handleRun(request);
    }

    if (url.pathname.endsWith("/start") && request.method === "POST") {
      return this.handleStart(request);
    }

    return new Response("Not found", { status: 404 });
  }

  // ── Schema initialisation ──────────────────────────────────────────────

  private ensureSchema(): void {
    if (this.initialized) return;

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        run_id   TEXT PRIMARY KEY,
        status   TEXT NOT NULL DEFAULT 'pending',
        result   TEXT,
        state    TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    this.initialized = true;
  }

  // ── Main handler ───────────────────────────────────────────────────────

  private async handleRun(request: Request): Promise<Response> {
    try {
      this.ensureSchema();

      const body = (await request.json()) as AgentRunRequest;
      const { runId } = body;

      // Idempotency check — return cached result if already completed
      const existing = this.ctx.storage.sql
        .exec("SELECT status, result FROM agent_runs WHERE run_id = ?", runId)
        .toArray();

      if (existing.length > 0) {
        const row = existing[0] as { status: string; result: string | null };
        if (row.status === "completed" && row.result) {
          return Response.json(JSON.parse(row.result));
        }
      }

      // Mark as running (upsert)
      this.ctx.storage.sql.exec(
        `INSERT INTO agent_runs (run_id, status) VALUES (?, 'running')
         ON CONFLICT(run_id) DO UPDATE SET status = 'running', updated_at = datetime('now')`,
        runId
      );

      const nodeToolProvider = await buildNodeToolProvider(
        this.env,
        body.organizationId
      );

      // Resolve tool definitions from references and apply code mode
      const resolvedTools = await resolveTools(body.tools, nodeToolProvider);
      const toolDefinitions = applyCodeMode(
        this.env,
        resolvedTools,
        body.codeMode ?? false
      );

      // Build the user message (with optional context)
      const userMessage = body.context
        ? `Context:\n${body.context}\n\nRequest:\n${body.input}`
        : body.input;

      // Build resume state from persisted conversation (if stateful)
      const resumeState = this.buildResumeState(
        body.agentId,
        userMessage,
        body.maxHistory ?? 50
      );

      const { callLLM, callFinalLLM } = this.buildLlmCallbacks(body);

      // Run the agent loop
      const result = await runAgentLoop({
        userMessage,
        tools: toolDefinitions,
        maxSteps: body.maxSteps,
        callLLM,
        callFinalLLM,
        onStepComplete: async (state) => {
          this.ctx.storage.sql.exec(
            `UPDATE agent_runs SET state = ?, updated_at = datetime('now') WHERE run_id = ?`,
            JSON.stringify(state),
            runId
          );
        },
        resumeState,
      });

      // This runner configures no suspending tools, so the loop always
      // completes; narrow the union for the persistence/response below.
      if (result.status === "suspended") {
        throw new Error("Agent loop suspended unexpectedly");
      }

      // Persist conversation state for stateful sessions
      const agentMessages = this.persistConversationState(
        body.agentId,
        userMessage,
        result
      );

      const response: AgentRunResponse = {
        text: result.text,
        steps: result.steps,
        finishReason: result.finishReason,
        totalSteps: result.totalSteps,
        totalInputTokens: result.totalInputTokens,
        totalOutputTokens: result.totalOutputTokens,
        ...(agentMessages && { agentMessages }),
      };

      // Cache the completed result
      this.ctx.storage.sql.exec(
        `UPDATE agent_runs SET status = 'completed', result = ?, updated_at = datetime('now') WHERE run_id = ?`,
        JSON.stringify(response),
        runId
      );

      return Response.json(response);
    } catch (error) {
      console.error("AgentRunner error:", error);
      return Response.json(
        {
          error: "Agent execution failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  // ── Async start handler ────────────────────────────────────────────────

  /**
   * Non-blocking handler: starts the agent loop in the background and returns
   * immediately. When the loop finishes, sends a completion event to the
   * workflow instance via EXECUTE.get(instanceId).sendEvent().
   */
  private async handleStart(request: Request): Promise<Response> {
    try {
      this.ensureSchema();

      const body = (await request.json()) as AgentRunRequest;
      const { runId, executionInstanceId, nodeId, pricing } = body;

      if (!executionInstanceId || !nodeId) {
        return Response.json(
          { error: "executionInstanceId and nodeId are required for /start" },
          { status: 400 }
        );
      }

      // Idempotency: if already completed, send event with cached result
      const existing = this.ctx.storage.sql
        .exec("SELECT status, result FROM agent_runs WHERE run_id = ?", runId)
        .toArray();

      if (existing.length > 0) {
        const row = existing[0] as { status: string; result: string | null };
        if (row.status === "completed" && row.result) {
          // Re-send the event in case the previous send was lost
          const cached = JSON.parse(row.result) as AgentRunResponse;
          const usage = pricing
            ? calculateTokenUsage(
                cached.totalInputTokens,
                cached.totalOutputTokens,
                pricing
              )
            : 1;

          await this.sendCompletionEvent(
            executionInstanceId,
            nodeId,
            cached,
            usage
          );
          return Response.json({ status: "completed" });
        }
      }

      // Mark as running (upsert)
      this.ctx.storage.sql.exec(
        `INSERT INTO agent_runs (run_id, status) VALUES (?, 'running')
         ON CONFLICT(run_id) DO UPDATE SET status = 'running', updated_at = datetime('now')`,
        runId
      );

      // Fire background execution — runs after this response is sent
      this.ctx.waitUntil(this.runAgentInBackground(body));

      return Response.json({ status: "started" });
    } catch (error) {
      console.error("AgentRunner /start error:", error);
      return Response.json(
        {
          error: "Failed to start agent",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  /**
   * Runs the agent loop in the background (via waitUntil).
   * On completion, caches the result and sends a completion event to the workflow.
   */
  private async runAgentInBackground(body: AgentRunRequest): Promise<void> {
    const { runId, executionInstanceId, nodeId, pricing } = body;

    try {
      const nodeToolProvider = await buildNodeToolProvider(
        this.env,
        body.organizationId
      );

      const resolvedTools = await resolveTools(body.tools, nodeToolProvider);
      const toolDefinitions = applyCodeMode(
        this.env,
        resolvedTools,
        body.codeMode ?? false
      );

      const userMessage = body.context
        ? `Context:\n${body.context}\n\nRequest:\n${body.input}`
        : body.input;

      // Build resume state from persisted conversation (if stateful)
      const resumeState = this.buildResumeState(
        body.agentId,
        userMessage,
        body.maxHistory ?? 50
      );

      const { callLLM, callFinalLLM } = this.buildLlmCallbacks(body);

      const result = await runAgentLoop({
        userMessage,
        tools: toolDefinitions,
        maxSteps: body.maxSteps,
        callLLM,
        callFinalLLM,
        onStepComplete: async (state) => {
          this.ctx.storage.sql.exec(
            `UPDATE agent_runs SET state = ?, updated_at = datetime('now') WHERE run_id = ?`,
            JSON.stringify(state),
            runId
          );
        },
        resumeState,
      });

      // This runner configures no suspending tools, so the loop always
      // completes; narrow the union for the persistence/response below.
      if (result.status === "suspended") {
        throw new Error("Agent loop suspended unexpectedly");
      }

      // Persist conversation state for stateful sessions
      const agentMessages = this.persistConversationState(
        body.agentId,
        userMessage,
        result
      );

      const response: AgentRunResponse = {
        text: result.text,
        steps: result.steps,
        finishReason: result.finishReason,
        totalSteps: result.totalSteps,
        totalInputTokens: result.totalInputTokens,
        totalOutputTokens: result.totalOutputTokens,
        ...(agentMessages && { agentMessages }),
      };

      // Cache the completed result
      this.ctx.storage.sql.exec(
        `UPDATE agent_runs SET status = 'completed', result = ?, updated_at = datetime('now') WHERE run_id = ?`,
        JSON.stringify(response),
        runId
      );

      // Calculate usage and send event to the workflow
      const usage = pricing
        ? calculateTokenUsage(
            result.totalInputTokens,
            result.totalOutputTokens,
            pricing
          )
        : 1;

      await this.sendCompletionEvent(
        executionInstanceId!,
        nodeId!,
        response,
        usage
      );
    } catch (error) {
      console.error("AgentRunner background error:", error);

      // Mark as failed
      this.ctx.storage.sql.exec(
        `UPDATE agent_runs SET status = 'error', updated_at = datetime('now') WHERE run_id = ?`,
        runId
      );

      // Send error event so the workflow doesn't hang
      if (executionInstanceId && nodeId) {
        try {
          const instance = await this.env.EXECUTE.get(executionInstanceId);
          await instance.sendEvent({
            type: `agent-complete-${nodeId}`,
            payload: {
              outputs: {},
              usage: 0,
              error:
                error instanceof Error
                  ? error.message
                  : "Agent execution failed",
            },
          });
        } catch (sendError) {
          console.error("Failed to send error event to workflow:", sendError);
        }
      }
    }
  }

  /**
   * Sends a completion event to the workflow instance.
   */
  private async sendCompletionEvent(
    executionInstanceId: string,
    nodeId: string,
    response: AgentRunResponse,
    usage: number
  ): Promise<void> {
    const instance = await this.env.EXECUTE.get(executionInstanceId);
    await instance.sendEvent({
      type: `agent-complete-${nodeId}`,
      payload: {
        outputs: {
          text: response.text,
          steps: response.steps,
          total_steps: response.totalSteps,
          finish_reason: response.finishReason,
          usage_metadata: {
            totalInputTokens: response.totalInputTokens,
            totalOutputTokens: response.totalOutputTokens,
          },
          ...(response.agentMessages && {
            agent_messages: response.agentMessages,
          }),
        },
        usage,
        ...(response.finishReason === "error" && {
          error: response.text || "Agent execution failed",
        }),
      },
    });
  }

  // ── Conversation state helpers ───────────────────────────────────────

  /**
   * If a agentId is set and previous messages exist, builds a
   * resumeState so the agent loop continues from the prior conversation.
   */
  private buildResumeState(
    agentId: string | undefined,
    userMessage: string,
    maxHistory: number
  ): AgentLoopState | undefined {
    if (!agentId) return undefined;
    const prev = this.state?.messages;
    if (!prev || prev.length === 0) return undefined;

    // Take the most recent messages, capped by maxHistory
    const trimmed = prev.length > maxHistory ? prev.slice(-maxHistory) : prev;

    return {
      messages: [...trimmed, { role: "user" as const, content: userMessage }],
      steps: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
  }

  /**
   * After an agent run completes, persists the full conversation history
   * when agentId is set. Returns the conversation messages for
   * inclusion in the response, or undefined for ephemeral runs.
   */
  private persistConversationState(
    agentId: string | undefined,
    userMessage: string,
    result: AgentLoopResult
  ): AgentMessage[] | undefined {
    if (!agentId) return undefined;

    const prevMessages = this.state?.messages ?? [];
    const newMessages: AgentMessage[] = [
      { role: "user", content: userMessage },
    ];
    for (const step of result.steps) {
      newMessages.push(step.assistantMessage);
      newMessages.push(...step.toolResults);
    }
    newMessages.push({ role: "assistant", content: result.text });

    const allMessages = [...prevMessages, ...newMessages];
    this.setState({
      messages: allMessages,
      totalInputTokens:
        (this.state?.totalInputTokens ?? 0) + result.totalInputTokens,
      totalOutputTokens:
        (this.state?.totalOutputTokens ?? 0) + result.totalOutputTokens,
    });
    return allMessages;
  }

  // ── Built-in Gemini tools ─────────────────────────────────────────────

  private buildGeminiBuiltInTools(
    body: AgentRunRequest
  ): Record<string, unknown>[] {
    const tools: Record<string, unknown>[] = [];
    if (body.googleSearch) tools.push({ googleSearch: {} });
    return tools;
  }

  // ── LLM dispatch ──────────────────────────────────────────────────────

  /**
   * Build the loop's `callLLM`/`callFinalLLM` callbacks for a request. The
   * final-turn callback is only present when a structured-output schema is
   * supplied; both dispatch through the shared `callAgentLLM`.
   */
  private buildLlmCallbacks(body: AgentRunRequest): {
    callLLM: (
      messages: AgentMessage[],
      tools: ToolDefinition[]
    ) => Promise<LLMResponse>;
    callFinalLLM?: (
      messages: AgentMessage[],
      tools: ToolDefinition[]
    ) => Promise<LLMResponse>;
  } {
    const builtInTools = this.buildGeminiBuiltInTools(body);
    const jsonSchema = toJsonSchema(body.schema);
    const llm = (
      messages: AgentMessage[],
      tools: ToolDefinition[],
      schema?: Record<string, unknown>
    ) =>
      callAgentLLM(this.env, {
        provider: body.provider,
        model: body.model,
        instructions: body.instructions,
        messages,
        tools,
        builtInTools,
        schema,
      });
    return {
      callLLM: (messages, tools) => llm(messages, tools),
      callFinalLLM: jsonSchema
        ? (messages, tools) => llm(messages, tools, jsonSchema)
        : undefined,
    };
  }
}
