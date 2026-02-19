/**
 * AgentRunner Durable Object
 *
 * Runs a multi-turn agent loop (LLM → tools → LLM → …) with persistent
 * state in SQLite. If a Workflow step re-executes after an engine restart,
 * the DO returns its cached result instantly (idempotent).
 *
 * Supports four LLM providers: anthropic, google, openai, workers-ai.
 */

import { DurableObject } from "cloudflare:workers";
import Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition, ToolReference } from "@dafthunk/runtime";
import { NodeToolProvider } from "@dafthunk/runtime";
import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type {
  AgentLoopResult,
  AgentMessage,
  LLMResponse,
} from "@dafthunk/runtime/utils/agent-loop";
import { runAgentLoop } from "@dafthunk/runtime/utils/agent-loop";
import {
  getAnthropicConfig,
  getGoogleAIConfig,
  getOpenAIConfig,
} from "@dafthunk/runtime/utils/ai-gateway";
import type { TokenPricing } from "@dafthunk/runtime/utils/usage";
import { calculateTokenUsage } from "@dafthunk/runtime/utils/usage";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";
import { CloudflareObjectStore } from "../runtime/cloudflare-object-store";
import { createToolContext } from "../runtime/tool-context";

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
}

export interface AgentRunResponse {
  text: string;
  steps: AgentLoopResult["steps"];
  finishReason: AgentLoopResult["finishReason"];
  totalSteps: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ── Durable Object ───────────────────────────────────────────────────────

export class AgentRunner extends DurableObject<Bindings> {
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

      // Build tool infrastructure
      const nodeRegistry = new CloudflareNodeRegistry(this.env, false);
      const objectStore = new CloudflareObjectStore(this.env.RESSOURCES);
      const nodeToolProvider = new NodeToolProvider(
        nodeRegistry,
        (nodeId, inputs) =>
          createToolContext(nodeId, inputs, this.env, objectStore)
      );

      // Resolve tool definitions from references
      const toolDefinitions = await this.resolveTools(
        body.tools,
        nodeToolProvider
      );

      // Build the user message (with optional context)
      const userMessage = body.context
        ? `Context:\n${body.context}\n\nRequest:\n${body.input}`
        : body.input;

      // Run the agent loop
      const result = await runAgentLoop({
        userMessage,
        tools: toolDefinitions,
        maxSteps: body.maxSteps,
        callLLM: (messages, tools) =>
          this.callLLM(
            body.provider,
            body.model,
            body.instructions,
            messages,
            tools
          ),
        onStepComplete: async (state) => {
          this.ctx.storage.sql.exec(
            `UPDATE agent_runs SET state = ?, updated_at = datetime('now') WHERE run_id = ?`,
            JSON.stringify(state),
            runId
          );
        },
      });

      const response: AgentRunResponse = {
        text: result.text,
        steps: result.steps,
        finishReason: result.finishReason,
        totalSteps: result.totalSteps,
        totalInputTokens: result.totalInputTokens,
        totalOutputTokens: result.totalOutputTokens,
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
      // Build tool infrastructure
      const nodeRegistry = new CloudflareNodeRegistry(this.env, false);
      const objectStore = new CloudflareObjectStore(this.env.RESSOURCES);
      const nodeToolProvider = new NodeToolProvider(
        nodeRegistry,
        (nId, inputs) => createToolContext(nId, inputs, this.env, objectStore)
      );

      const toolDefinitions = await this.resolveTools(
        body.tools,
        nodeToolProvider
      );

      const userMessage = body.context
        ? `Context:\n${body.context}\n\nRequest:\n${body.input}`
        : body.input;

      const result = await runAgentLoop({
        userMessage,
        tools: toolDefinitions,
        maxSteps: body.maxSteps,
        callLLM: (messages, tools) =>
          this.callLLM(
            body.provider,
            body.model,
            body.instructions,
            messages,
            tools
          ),
        onStepComplete: async (state) => {
          this.ctx.storage.sql.exec(
            `UPDATE agent_runs SET state = ?, updated_at = datetime('now') WHERE run_id = ?`,
            JSON.stringify(state),
            runId
          );
        },
      });

      const response: AgentRunResponse = {
        text: result.text,
        steps: result.steps,
        finishReason: result.finishReason,
        totalSteps: result.totalSteps,
        totalInputTokens: result.totalInputTokens,
        totalOutputTokens: result.totalOutputTokens,
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
        },
        usage,
      },
    });
  }

  // ── Tool resolution ────────────────────────────────────────────────────

  private async resolveTools(
    toolRefs: ToolReference[],
    nodeToolProvider: NodeToolProvider
  ): Promise<ToolDefinition[]> {
    if (!toolRefs || toolRefs.length === 0) return [];

    const definitions: ToolDefinition[] = [];
    for (const ref of toolRefs) {
      try {
        const def = await nodeToolProvider.getToolDefinition(ref.identifier);
        definitions.push(def);
      } catch (error) {
        console.warn(`Failed to resolve tool ${ref.identifier}:`, error);
      }
    }
    return definitions;
  }

  // ── LLM dispatch ──────────────────────────────────────────────────────

  private async callLLM(
    provider: AgentProvider,
    model: string,
    instructions: string,
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    switch (provider) {
      case "anthropic":
        return this.callAnthropic(model, instructions, messages, tools);
      case "google":
        return this.callGoogle(model, instructions, messages, tools);
      case "openai":
        return this.callOpenAI(model, instructions, messages, tools);
      case "workers-ai":
        return this.callWorkersAI(model, instructions, messages, tools);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // ── Anthropic ──────────────────────────────────────────────────────────

  private async callAnthropic(
    model: string,
    instructions: string,
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const client = new Anthropic({
      apiKey: "gateway-managed",
      timeout: 120_000,
      ...getAnthropicConfig(this.env),
    });

    // Convert generic messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => {
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant" as const,
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
            ...m.toolCalls.map((tc) => ({
              type: "tool_use" as const,
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            })),
          ],
        };
      }
      if (m.role === "tool") {
        return {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: m.toolCallId!,
              content: m.content,
            },
          ],
        };
      }
      return {
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      };
    });

    // Convert tools to Anthropic format
    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: anthropicMessages,
      ...(instructions && { system: instructions }),
      ...(anthropicTools.length > 0 && { tools: anthropicTools }),
    });

    // Parse response
    let content = "";
    const toolCalls: LLMResponse["toolCalls"] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  // ── Google (Gemini) ────────────────────────────────────────────────────

  private async callGoogle(
    model: string,
    instructions: string,
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const ai = new GoogleGenAI({
      apiKey: "gateway-managed",
      ...getGoogleAIConfig(this.env),
    });

    // Build contents from message history
    const contents: Array<{
      role: string;
      parts: Array<Record<string, unknown>>;
    }> = [];
    for (const m of messages) {
      if (m.role === "user") {
        contents.push({ role: "user", parts: [{ text: m.content }] });
      } else if (m.role === "assistant") {
        const parts: Array<Record<string, unknown>> = [];
        if (m.content) parts.push({ text: m.content });
        if (m.toolCalls) {
          for (const tc of m.toolCalls) {
            parts.push({
              functionCall: { name: tc.name, args: tc.arguments },
            });
          }
        }
        contents.push({ role: "model", parts });
      } else if (m.role === "tool") {
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: m.toolName,
                response: safeJsonParse(m.content),
              },
            },
          ],
        });
      }
    }

    // Convert tools to Gemini format
    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const config: Record<string, unknown> = {};
    if (functionDeclarations.length > 0) {
      config.tools = [{ functionDeclarations }];
    }

    const response = await ai.models.generateContent({
      model,
      contents: contents as any,
      config: config as any,
      ...(instructions && { systemInstruction: instructions }),
    });

    // Parse response
    let content = "";
    const toolCalls: LLMResponse["toolCalls"] = [];

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts as any[]) {
        if (part.text) {
          content += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args ?? {},
          });
        }
      }
    }

    const usage = response.usageMetadata;
    return {
      content,
      toolCalls,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  }

  // ── OpenAI ─────────────────────────────────────────────────────────────

  private async callOpenAI(
    model: string,
    instructions: string,
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const client = new OpenAI({
      apiKey: "gateway-managed",
      timeout: 120_000,
      ...getOpenAIConfig(this.env),
    });

    // Convert generic messages to OpenAI format
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (instructions) {
      openaiMessages.push({ role: "system", content: instructions });
    }

    for (const m of messages) {
      if (m.role === "user") {
        openaiMessages.push({ role: "user", content: m.content });
      } else if (m.role === "assistant") {
        openaiMessages.push({
          role: "assistant",
          content: m.content || null,
          ...(m.toolCalls?.length && {
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          }),
        });
      } else if (m.role === "tool") {
        openaiMessages.push({
          role: "tool",
          tool_call_id: m.toolCallId!,
          content: m.content,
        });
      }
    }

    // Convert tools to OpenAI format
    const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: openaiMessages,
      ...(openaiTools.length > 0 && { tools: openaiTools }),
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content ?? "";
    const toolCalls: LLMResponse["toolCalls"] = [];

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        if (tc.type === "function") {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: safeJsonParse(tc.function.arguments),
          });
        }
      }
    }

    return {
      content,
      toolCalls,
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
  }

  // ── Workers AI ─────────────────────────────────────────────────────────

  private async callWorkersAI(
    model: string,
    _instructions: string,
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    // Workers AI uses OpenAI-compatible chat format
    const aiMessages: Array<{ role: string; content: string }> = [];

    if (_instructions) {
      aiMessages.push({ role: "system", content: _instructions });
    }

    for (const m of messages) {
      if (m.role === "tool") {
        // Workers AI doesn't have a native tool role — inject as user message
        aiMessages.push({
          role: "user",
          content: `Tool result for ${m.toolName}: ${m.content}`,
        });
      } else {
        aiMessages.push({ role: m.role, content: m.content });
      }
    }

    // Workers AI tool format (OpenAI-compatible)
    const aiTools =
      tools.length > 0
        ? tools.map((t) => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

    const result = (await this.env.AI.run(
      model as keyof AiModels,
      {
        messages: aiMessages,
        ...(aiTools && { tools: aiTools }),
        stream: false,
      } as any
    )) as any;

    // Workers AI returns OpenAI chat-completions format
    const choice = result?.choices?.[0]?.message;
    const content: string = choice?.content ?? "";
    const toolCalls: LLMResponse["toolCalls"] = [];

    if (choice?.tool_calls) {
      for (const tc of choice.tool_calls) {
        toolCalls.push({
          id:
            tc.id ??
            `wai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: tc.function.name,
          arguments: safeJsonParse(tc.function.arguments),
        });
      }
    }

    const usage = result?.usage;
    return {
      content,
      toolCalls,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function safeJsonParse(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return { raw: value };
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}
