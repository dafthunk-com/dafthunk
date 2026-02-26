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

  /** Called after each iteration so the caller can persist state */
  onStepComplete?: (state: AgentLoopState) => Promise<void>;

  /** If provided, resume from a previous state instead of starting fresh */
  resumeState?: AgentLoopState;
}

export interface AgentLoopState {
  messages: AgentMessage[];
  steps: AgentStep[];
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface AgentLoopResult {
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

// ── Core loop ────────────────────────────────────────────────────────────

export async function runAgentLoop(
  config: AgentLoopConfig
): Promise<AgentLoopResult> {
  const { userMessage, tools, maxSteps, callLLM, onStepComplete } = config;

  // Initialise or resume state
  const state: AgentLoopState = config.resumeState ?? {
    messages: [{ role: "user", content: userMessage }],
    steps: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

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

    // Execute each tool call
    const toolResults: AgentMessage[] = [];
    for (const toolCall of llmResponse.toolCalls) {
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

  // If we exhausted maxSteps, do one final LLM call without tools to summarise
  if (state.steps.length >= maxSteps) {
    finishReason = "max_steps_reached";

    const finalResponse = await callLLM(state.messages, []);
    state.totalInputTokens += finalResponse.inputTokens;
    state.totalOutputTokens += finalResponse.outputTokens;

    state.messages.push({
      role: "assistant",
      content: finalResponse.content,
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
    text,
    steps: state.steps,
    finishReason,
    totalSteps: state.steps.length,
    totalInputTokens: state.totalInputTokens,
    totalOutputTokens: state.totalOutputTokens,
  };
}
