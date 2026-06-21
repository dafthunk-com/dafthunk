import type { NodeExecution, NodeType } from "@dafthunk/types";

import type { NodeContext } from "../../node-types";
import { ExecutableNode } from "../../node-types";
import type { TokenPricing } from "../../utils/usage";
import type { AgentProvider } from "../agent/base-agent-node";

export interface EmailAgentNodeConfig {
  provider: AgentProvider;
  model: string;
  pricing: TokenPricing;
}

const DEFAULT_REPLY_TIMEOUT = "3 days";
const DEFAULT_MAX_ROUNDS = 10;
/** Upper bound for the workflow's backstop wait (the DO finishes well before). */
const MAX_BACKSTOP_MS = 30 * 24 * 60 * 60 * 1000;

const EMAIL_AGENT_INPUTS: NodeType["inputs"] = [
  {
    name: "from",
    description:
      "Handle of the organization email address to send from (the part before @).",
    type: "string",
    required: true,
  },
  {
    name: "interlocutors",
    description:
      "People the agent may email: an array of { id, email, name?, role? }. The agent addresses them by id.",
    type: "json",
    required: true,
  },
  {
    name: "objective",
    description: "The goal the agent should pursue through the conversation.",
    type: "string",
    required: true,
  },
  {
    name: "instructions",
    description: "Optional persona / behavioural system prompt.",
    type: "string",
    required: false,
  },
  {
    name: "context",
    description: "Optional background material for the agent.",
    type: "string",
    required: false,
  },
  {
    name: "subject",
    description: "Default subject for newly opened email threads.",
    type: "string",
    required: false,
  },
  {
    name: "max_rounds",
    description: `Maximum conversation rounds before wrapping up (default ${DEFAULT_MAX_ROUNDS}).`,
    type: "number",
    required: false,
    value: DEFAULT_MAX_ROUNDS,
  },
  {
    name: "reply_timeout",
    description: `How long to wait for each reply, e.g. "3 days", "24 hours" (default ${DEFAULT_REPLY_TIMEOUT}).`,
    type: "string",
    required: false,
    value: DEFAULT_REPLY_TIMEOUT,
  },
  {
    name: "tools",
    description: "Tool references the agent may call between emails.",
    type: "json",
    required: false,
  },
  {
    name: "schema",
    description: "Optional schema constraining the final result.",
    type: "schema",
    required: false,
    hidden: true,
  },
];

const EMAIL_AGENT_OUTPUTS: NodeType["outputs"] = [
  {
    name: "result",
    description: "The agent's final result once the objective is reached.",
    type: "any",
  },
  {
    name: "transcript",
    description:
      "Per-interlocutor record of the messages sent and replies received.",
    type: "json",
  },
  {
    name: "rounds",
    description: "Number of conversation rounds taken.",
    type: "number",
  },
  {
    name: "finish_reason",
    description: "Why the agent stopped: goal_reached, max_rounds, or error.",
    type: "string",
  },
  {
    name: "usage_metadata",
    description: "Token usage for the run.",
    type: "json",
    hidden: true,
  },
];

export function buildEmailAgentNodeType(meta: {
  id: string;
  name: string;
  description: string;
  tags: string[];
  documentation: string;
  subscription?: boolean;
}): NodeType {
  return {
    id: meta.id,
    name: meta.name,
    type: meta.id,
    description: meta.description,
    tags: meta.tags,
    icon: "mail",
    documentation: meta.documentation,
    usage: 1,
    subscription: meta.subscription,
    functionCalling: true,
    inputs: EMAIL_AGENT_INPUTS,
    outputs: EMAIL_AGENT_OUTPUTS,
  };
}

interface NormalizedInterlocutor {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/**
 * Base class for email-coordination agents. The agent emails one or more
 * interlocutors and waits — potentially for days — for their replies, looping
 * until the objective is met. Execution is delegated to the EmailAgentRunner
 * Durable Object; this node fires it and parks on a completion event.
 *
 * Requires durable workflow execution (not available in worker mode).
 */
export abstract class BaseEmailAgentNode extends ExecutableNode {
  protected static readonly agentConfig: EmailAgentNodeConfig;

  async execute(context: NodeContext): Promise<NodeExecution> {
    const config = (this.constructor as typeof BaseEmailAgentNode).agentConfig;

    if (!context.asyncSupported || !context.executionId) {
      return this.createErrorResult(
        "Email Agent requires durable workflow execution (not available in worker mode)"
      );
    }

    // Cast to the non-generic namespace to avoid deep `<any>` stub typing.
    const runner = context.env.EMAIL_AGENT_RUNNER as
      | DurableObjectNamespace
      | undefined;
    if (!runner) {
      return this.createErrorResult("Email agent runner is not available");
    }

    const from = (context.inputs.from as string | undefined)?.trim();
    const objective = (context.inputs.objective as string | undefined)?.trim();
    if (!from) return this.createErrorResult("'from' handle is required");
    if (!objective) return this.createErrorResult("'objective' is required");

    const interlocutors = normalizeInterlocutors(context.inputs.interlocutors);
    if (interlocutors.length === 0) {
      return this.createErrorResult(
        "At least one interlocutor with an email address is required"
      );
    }

    const maxRounds = clampInt(
      context.inputs.max_rounds as number | undefined,
      DEFAULT_MAX_ROUNDS
    );
    const replyTimeoutMs = parseDuration(
      context.inputs.reply_timeout as string | undefined,
      DEFAULT_REPLY_TIMEOUT
    );

    const runId = `${context.executionId}:${context.nodeId}`;
    const request = {
      runId,
      executionInstanceId: context.executionId,
      nodeId: context.nodeId,
      provider: config.provider,
      model: config.model,
      pricing: config.pricing,
      organizationId: context.organizationId,
      fromHandle: from,
      interlocutors,
      objective,
      instructions: (context.inputs.instructions as string) || "",
      context: (context.inputs.context as string) || undefined,
      subject: (context.inputs.subject as string) || undefined,
      maxRounds,
      replyTimeoutMs,
      tools: context.inputs.tools ?? [],
      ...(context.inputs.schema ? { schema: context.inputs.schema } : {}),
    };

    try {
      const stub = runner.get(runner.idFromName(runId));
      const response = await stub.fetch("https://email-agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        return this.createErrorResult(
          error.error ?? "Failed to start email agent"
        );
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to start email agent"
      );
    }

    // Park until the runner reports completion. The backstop must outlast the
    // worst-case wait; the runner's per-reply alarm settles the run far sooner.
    const backstopMs = Math.min(
      maxRounds * replyTimeoutMs + 60 * 60 * 1000,
      MAX_BACKSTOP_MS
    );

    return {
      nodeId: this.node.id,
      status: "pending",
      usage: 0,
      pendingEvent: {
        type: `email-agent-complete-${context.nodeId}`,
        timeout: formatDuration(backstopMs),
      },
    };
  }
}

function normalizeInterlocutors(value: unknown): NormalizedInterlocutor[] {
  if (!Array.isArray(value)) return [];
  const out: NormalizedInterlocutor[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const email = typeof r.email === "string" ? r.email.trim() : "";
    if (!email) continue;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : email;
    out.push({
      id,
      email,
      ...(typeof r.name === "string" ? { name: r.name } : {}),
      ...(typeof r.role === "string" ? { role: r.role } : {}),
    });
  }
  return out;
}

function clampInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

const UNIT_MS: Record<string, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

/** Parse a "<n> <unit>" duration (minutes/hours/days) into milliseconds. */
function parseDuration(value: string | undefined, fallback: string): number {
  const match = (value ?? fallback)
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(minute|hour|day)s?$/);
  if (!match) return parseDuration(fallback, "3 days");
  return Math.round(parseFloat(match[1]) * UNIT_MS[match[2]]);
}

/** Format milliseconds as a Cloudflare Workflows timeout string. */
function formatDuration(ms: number): string {
  const day = UNIT_MS.day;
  const hour = UNIT_MS.hour;
  if (ms >= day) return `${Math.ceil(ms / day)} days`;
  if (ms >= hour) return `${Math.ceil(ms / hour)} hours`;
  return `${Math.max(1, Math.ceil(ms / UNIT_MS.minute))} minutes`;
}
