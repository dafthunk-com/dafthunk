/**
 * Provider-agnostic agent loop for multi-turn tool-calling LLM interactions.
 *
 * The loop calls an LLM, parses tool calls from the response, executes them,
 * feeds results back, and repeats until the model stops calling tools or
 * the step limit is reached.
 *
 * Designed for use inside a Durable Object that persists state after each
 * iteration so that Workflow engine restarts are safe.
 */

import type { ToolDefinition } from "../tool-types";

// ── Types ────────────────────────────────────────────────────────────────

export interface AgentMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  /** Present when role === "assistant" and the model requested tool calls */
  toolCalls?: AgentToolCall[];
  /** Present when role === "tool" — the id of the tool call this result is for */
  toolCallId?: string;
  /** Present when role === "tool" — the name of the tool that was called */
  toolName?: string;
}

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /** Gemini 3.x thought signature — must be echoed back in subsequent turns */
  thoughtSignature?: string;
}

export interface AgentStep {
  stepNumber: number;
  assistantMessage: AgentMessage;
  toolResults: AgentMessage[];
}

export interface LLMResponse {
  content: string;
  toolCalls: AgentToolCall[];
  inputTokens: number;
  outputTokens: number;
}

export type FinishReason = "completed" | "max_steps_reached" | "error";

export interface AgentLoopConfig {
  /** Initial user message */
  userMessage: string;
  /** Available tool definitions (already resolved from the tool registry) */
  tools: ToolDefinition[];
  /** Maximum number of agent steps (LLM calls that produce tool calls) */
  maxSteps: number;

  /** Provider-specific LLM call — receives full message history, returns response */
  callLLM: (
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ) => Promise<LLMResponse>;

  /**
   * Optional LLM call used for the final output-producing turn.
   * When provided (e.g. to enforce a JSON schema), this replaces `callLLM`
   * for the last call that generates the user-facing response.
   */
  callFinalLLM?: (
    messages: AgentMessage[],
    tools: ToolDefinition[]
  ) => Promise<LLMResponse>;

  /** Called after each iteration so the caller can persist state */
  onStepComplete?: (state: AgentLoopState) => Promise<void>;

  /** If provided, resume from a previous state instead of starting fresh */
  resumeState?: AgentLoopState;

  /**
   * Predicate marking a tool as *suspending*: its result is not available
   * synchronously. When the model calls one or more suspending tools in a turn,
   * the loop executes any non-suspending tool calls in that same turn, then
   * stops and returns an {@link AgentLoopSuspension} instead of an
   * {@link AgentLoopResult}. The caller performs the long-running work (e.g.
   * emailing an interlocutor and parking until a reply arrives) and later
   * resumes by calling the loop again with `resumeState` plus
   * `resumeToolResults` for the suspended calls.
   *
   * Suspending and non-suspending tool calls can be mixed in a single turn; the
   * non-suspending ones run immediately so their results are ready on resume.
   */
  isSuspendingTool?: (toolName: string) => boolean;

  /**
   * Results for the tool calls that suspended the loop, supplied when resuming.
   * Must be provided together with a `resumeState` returned from a prior
   * suspension. Each entry resolves one of the suspension's `pendingToolCalls`.
   */
  resumeToolResults?: ResolvedToolResult[];
}

/** Resolved result for a previously-suspended tool call, supplied on resume. */
export interface ResolvedToolResult {
  /** Matches {@link AgentToolCall.id} of the suspended call */
  toolCallId: string;
  /** Name of the tool that was called */
  toolName: string;
  /** The tool result content (e.g. the interlocutor's reply text) */
  content: string;
}

export interface AgentLoopState {
  messages: AgentMessage[];
  steps: AgentStep[];
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface AgentLoopResult {
  /** Discriminant: the loop ran to completion */
  status: "completed";
  /** Final text output from the agent */
  text: string;
  /** All steps taken (tool call + result pairs) */
  steps: AgentStep[];
  /** Why the loop ended */
  finishReason: FinishReason;
  /** Total number of LLM calls that produced tool calls */
  totalSteps: number;
  /** Accumulated token usage */
  totalInputTokens: number;
  totalOutputTokens: number;
}

/**
 * Returned instead of {@link AgentLoopResult} when the model called one or more
 * suspending tools (see {@link AgentLoopConfig.isSuspendingTool}). The caller
 * must fulfil every `pendingToolCall`, persist `state`, and later resume by
 * calling {@link runAgentLoop} with `resumeState: state` and matching
 * `resumeToolResults`.
 */
export interface AgentLoopSuspension {
  /** Discriminant: the loop is parked awaiting async tool results */
  status: "suspended";
  /** Tool calls whose results must be supplied before the loop can resume */
  pendingToolCalls: AgentToolCall[];
  /** Loop state to persist and pass back as `resumeState` on resume */
  state: AgentLoopState;
}

export type AgentLoopOutcome = AgentLoopResult | AgentLoopSuspension;

// ── Core loop ────────────────────────────────────────────────────────────

export async function runAgentLoop(
  config: AgentLoopConfig
): Promise<AgentLoopOutcome> {
  const { userMessage, tools, maxSteps, callLLM, onStepComplete } = config;
  const finalLLM = config.callFinalLLM ?? callLLM;

  // Initialise or resume state
  const state: AgentLoopState = config.resumeState ?? {
    messages: [{ role: "user", content: userMessage }],
    steps: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  // Resuming a suspended turn: inject the async tool results for the calls that
  // parked the loop, completing the in-flight turn before continuing. The
  // suspended assistant message and any synchronous tool results are already in
  // `state.messages`; we append the resolved results and record the step.
  if (config.resumeState && config.resumeToolResults) {
    recordSuspendedStep(state, config.resumeToolResults);
    if (onStepComplete) {
      await onStepComplete(state);
    }
  }

  let finishReason: FinishReason = "completed";

  while (state.steps.length < maxSteps) {
    // Call the LLM with the current tools
    let llmResponse: LLMResponse;
    try {
      llmResponse = await callLLM(state.messages, tools);
    } catch (error) {
      console.error("LLM call failed:", error);
      finishReason = "error";
      state.messages.push({
        role: "assistant",
        content: `LLM call failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      break;
    }

    state.totalInputTokens += llmResponse.inputTokens;
    state.totalOutputTokens += llmResponse.outputTokens;

    // If no tool calls, the model is done
    if (llmResponse.toolCalls.length === 0) {
      // Append final assistant message
      state.messages.push({
        role: "assistant",
        content: llmResponse.content,
      });
      finishReason = "completed";
      break;
    }

    // Build assistant message with tool calls
    const assistantMessage: AgentMessage = {
      role: "assistant",
      content: llmResponse.content,
      toolCalls: llmResponse.toolCalls,
    };
    state.messages.push(assistantMessage);

    // Execute each tool call. Suspending tools are not run here — their results
    // arrive asynchronously, so we collect them and park the loop once the
    // synchronous calls in this turn have settled.
    const toolResults: AgentMessage[] = [];
    const pendingToolCalls: AgentToolCall[] = [];
    for (const toolCall of llmResponse.toolCalls) {
      if (config.isSuspendingTool?.(toolCall.name)) {
        pendingToolCalls.push(toolCall);
        continue;
      }

      const toolDef = tools.find((t) => t.name === toolCall.name);
      let resultContent: string;

      if (!toolDef) {
        resultContent = JSON.stringify({
          error: `Unknown tool: ${toolCall.name}`,
        });
      } else {
        try {
          resultContent = await toolDef.function(toolCall.arguments);
        } catch (error) {
          resultContent = JSON.stringify({
            error:
              error instanceof Error ? error.message : "Tool execution failed",
          });
        }
      }

      const toolMessage: AgentMessage = {
        role: "tool",
        content: resultContent,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      };
      toolResults.push(toolMessage);
      state.messages.push(toolMessage);
    }

    // Park the loop when the turn requested async results. The assistant message
    // and any synchronous tool results are already in `state.messages`; the
    // caller persists `state`, fulfils the pending calls, and resumes via
    // `resumeState` + `resumeToolResults`. The step is recorded on resume.
    if (pendingToolCalls.length > 0) {
      return { status: "suspended", pendingToolCalls, state };
    }

    // Record this step
    const step: AgentStep = {
      stepNumber: state.steps.length + 1,
      assistantMessage,
      toolResults,
    };
    state.steps.push(step);

    // Persist state after each iteration
    if (onStepComplete) {
      await onStepComplete(state);
    }
  }

  // When the loop exits via the while condition (rather than a break),
  // finishReason is still "completed" — reclassify as max_steps_reached.
  if (finishReason === "completed" && state.steps.length >= maxSteps) {
    finishReason = "max_steps_reached";

    // One final LLM call without tools to summarise
    const finalResponse = await finalLLM(state.messages, []);
    state.totalInputTokens += finalResponse.inputTokens;
    state.totalOutputTokens += finalResponse.outputTokens;

    state.messages.push({
      role: "assistant",
      content: finalResponse.content,
    });

    if (onStepComplete) {
      await onStepComplete(state);
    }
  } else if (finishReason === "completed" && config.callFinalLLM) {
    // The model completed normally and a callFinalLLM is provided: make one
    // additional call with schema constraints to produce structured output.
    // We pop the last assistant message so the model generates a fresh response
    // with the schema constraint, rather than seeing its own unformatted reply.
    state.messages.pop();

    const formatResponse = await finalLLM(state.messages, []);
    state.totalInputTokens += formatResponse.inputTokens;
    state.totalOutputTokens += formatResponse.outputTokens;

    state.messages.push({
      role: "assistant",
      content: formatResponse.content,
    });

    if (onStepComplete) {
      await onStepComplete(state);
    }
  }

  // The final text is the last assistant message
  const lastAssistant = [...state.messages]
    .reverse()
    .find((m) => m.role === "assistant" && !m.toolCalls);
  const text = lastAssistant?.content ?? "";

  return {
    status: "completed",
    text,
    steps: state.steps,
    finishReason,
    totalSteps: state.steps.length,
    totalInputTokens: state.totalInputTokens,
    totalOutputTokens: state.totalOutputTokens,
  };
}

/**
 * Completes a suspended turn on resume: appends the resolved tool results to the
 * conversation and records the step. The suspended assistant message (with its
 * tool calls) and any synchronous tool results from the same turn are already
 * the trailing messages in `state.messages`, so the step is reconstructed from
 * the tail: the last assistant message followed by every consecutive tool
 * message after it.
 */
function recordSuspendedStep(
  state: AgentLoopState,
  resolved: ResolvedToolResult[]
): void {
  for (const r of resolved) {
    state.messages.push({
      role: "tool",
      content: r.content,
      toolCallId: r.toolCallId,
      toolName: r.toolName,
    });
  }

  let i = state.messages.length - 1;
  while (i >= 0 && state.messages[i].role === "tool") {
    i--;
  }

  const assistantMessage = state.messages[i];
  if (!assistantMessage || assistantMessage.role !== "assistant") {
    throw new Error(
      "Cannot resume: no suspended assistant turn found in state.messages"
    );
  }

  state.steps.push({
    stepNumber: state.steps.length + 1,
    assistantMessage,
    toolResults: state.messages.slice(i + 1),
  });
}
