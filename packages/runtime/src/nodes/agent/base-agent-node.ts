import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// ── Public types ──────────────────────────────────────────────────────────

/** LLM providers supported by the AgentRunner Durable Object */
export type AgentProvider = "anthropic" | "google" | "openai" | "workers-ai";

/** Runtime config that subclasses provide — only what execute() needs */
export interface AgentNodeConfig {
  provider: AgentProvider;
  model: string;
  pricing: TokenPricing;
}

// ── Shared node metadata ──────────────────────────────────────────────────

/** Standard inputs shared by all agent nodes */
const AGENT_INPUTS: NodeType["inputs"] = [
  {
    name: "instructions",
    type: "string",
    description: "System instructions for the agent's behavior",
    required: false,
    value:
      "You are a helpful assistant. Use the available tools to accomplish the user's task.",
  },
  {
    name: "context",
    type: "string",
    description: "Optional context from upstream workflow nodes",
    required: false,
  },
  {
    name: "input",
    type: "string",
    description: "The task or question for the agent",
    required: true,
  },
  {
    name: "max_steps",
    type: "number",
    description: "Maximum number of agent steps (tool call rounds)",
    hidden: true,
    value: 10,
  },
  {
    name: "tools",
    type: "json",
    description: "Array of tool references for the agent to use",
    hidden: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: [] as any,
  },
];

/** Standard outputs shared by all agent nodes */
const AGENT_OUTPUTS: NodeType["outputs"] = [
  {
    name: "text",
    type: "string",
    description: "Final text response from the agent",
  },
  {
    name: "steps",
    type: "json",
    description: "Detailed steps taken by the agent",
    hidden: true,
  },
  {
    name: "total_steps",
    type: "number",
    description: "Number of tool-call rounds completed",
    hidden: true,
  },
  {
    name: "finish_reason",
    type: "string",
    description: "Why the agent stopped (completed, max_steps_reached, error)",
    hidden: true,
  },
  {
    name: "usage_metadata",
    type: "json",
    description: "Token usage and cost information",
    hidden: true,
  },
];

/**
 * Build a complete NodeType from partial metadata.
 * Fills in the standard agent inputs/outputs and common flags.
 */
export function buildAgentNodeType(meta: {
  id: string;
  name: string;
  description: string;
  tags: string[];
  documentation: string;
}): NodeType {
  return {
    id: meta.id,
    name: meta.name,
    type: meta.id,
    description: meta.description,
    tags: meta.tags,
    icon: "bot",
    documentation: meta.documentation,
    usage: 1,
    functionCalling: true,
    inputs: AGENT_INPUTS,
    outputs: AGENT_OUTPUTS,
  };
}

// ── Base class ────────────────────────────────────────────────────────────

/** Response shape returned by the AgentRunner DO */
interface AgentRunResponse {
  text: string;
  steps: unknown[];
  finishReason: string;
  totalSteps: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

/** Event payload sent by AgentRunner DO when async execution completes */
export interface AgentCompleteEvent {
  outputs: {
    text: string;
    steps: unknown[];
    total_steps: number;
    finish_reason: string;
    usage_metadata: { totalInputTokens: number; totalOutputTokens: number };
  };
  usage: number;
  error?: string;
}

/**
 * Base class for multi-turn agent nodes.
 *
 * Subclasses provide static `nodeType` and `agentConfig`
 * (provider, model, pricing). All execution logic lives here.
 *
 * Supports two execution modes:
 * - **Async** (WorkflowRuntime): fires /start, returns "pending", runtime waits via waitForEvent
 * - **Sync** (WorkerRuntime): blocks on /run until the agent loop completes
 */
export abstract class BaseAgentNode extends ExecutableNode {
  /** Subclasses must define this to configure the provider + model */
  protected static readonly agentConfig: AgentNodeConfig;

  async execute(context: NodeContext): Promise<NodeExecution> {
    const config = (this.constructor as typeof BaseAgentNode).agentConfig;

    if (context.asyncSupported && context.executionId) {
      return this.executeAsync(context, config);
    }
    return this.executeSync(context, config);
  }

  /**
   * Async mode: fires /start on the AgentRunner DO and returns "pending".
   * The runtime will park via waitForEvent until the DO sends a completion event.
   */
  private async executeAsync(
    context: NodeContext,
    config: AgentNodeConfig
  ): Promise<NodeExecution> {
    try {
      const { instructions, input, max_steps, tools } = context.inputs;
      const agentContext = context.inputs.context as string | undefined;

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      if (!context.env.AGENT_RUNNER) {
        return this.createErrorResult("Agent runner service is not available");
      }

      const agentRunner = context.env.AGENT_RUNNER as DurableObjectNamespace;
      const runId = `${context.executionId}:${context.nodeId}`;
      const doId = agentRunner.idFromName(runId);
      const stub = agentRunner.get(doId);

      const response = await stub.fetch("https://agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          executionInstanceId: context.executionId,
          nodeId: context.nodeId,
          provider: config.provider,
          model: config.model,
          pricing: config.pricing,
          instructions: instructions || "",
          context: agentContext,
          input,
          maxSteps: max_steps ?? 10,
          tools: tools ?? [],
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as {
          error: string;
          details?: string;
        };
        return this.createErrorResult(
          error.details ?? error.error ?? "Failed to start agent"
        );
      }

      // Return pending — the runtime will waitForEvent
      return {
        nodeId: this.node.id,
        status: "pending",
        usage: 0,
        pendingEvent: {
          type: `agent-complete:${context.nodeId}`,
          timeout: "30 minutes",
        },
      };
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Sync mode: blocks on /run until the agent loop completes.
   * Used by WorkerRuntime and as fallback when async is not supported.
   */
  private async executeSync(
    context: NodeContext,
    config: AgentNodeConfig
  ): Promise<NodeExecution> {
    try {
      const { instructions, input, max_steps, tools } = context.inputs;
      const agentContext = context.inputs.context as string | undefined;

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      if (!context.env.AGENT_RUNNER) {
        return this.createErrorResult("Agent runner service is not available");
      }

      const agentRunner = context.env.AGENT_RUNNER as DurableObjectNamespace;
      const runId = `${context.executionId ?? context.workflowId}:${context.nodeId}`;
      const doId = agentRunner.idFromName(runId);
      const stub = agentRunner.get(doId);

      const response = await stub.fetch("https://agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          provider: config.provider,
          model: config.model,
          instructions: instructions || "",
          context: agentContext,
          input,
          maxSteps: max_steps ?? 10,
          tools: tools ?? [],
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as {
          error: string;
          details?: string;
        };
        return this.createErrorResult(
          error.details ?? error.error ?? "Agent execution failed"
        );
      }

      const result = (await response.json()) as AgentRunResponse;

      const usage = calculateTokenUsage(
        result.totalInputTokens,
        result.totalOutputTokens,
        config.pricing
      );

      return this.createSuccessResult(
        {
          text: result.text,
          steps: result.steps,
          total_steps: result.totalSteps,
          finish_reason: result.finishReason,
          usage_metadata: {
            totalInputTokens: result.totalInputTokens,
            totalOutputTokens: result.totalOutputTokens,
          },
        },
        usage
      );
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
