import type {
  Edge,
  Workflow,
  WorkflowExecution,
  WorkflowTrigger,
} from "./workflow";
import type { Brief, BriefAnswers } from "./workflow-brief";

/**
 * Wire protocol for the workflow generator socket.
 *
 * Lives here so the API and the app agree on one definition, mirroring how
 * `ClientMessage`/`ServerMessage` are shared for the editor socket.
 */

export type GenerationPhase =
  | "briefing"
  | "planning"
  | "selecting"
  | "generating"
  | "validating"
  | "repairing"
  | "saving"
  | "running"
  | "complete";

/**
 * `awaiting` is the session sitting on a brief, waiting for a person.
 *
 * It is a distinct state rather than an idle one because a reload has to land
 * back on the sentence, and because the stall timeout must not apply to it —
 * someone reading their request back to themselves is not a hung run.
 */
export type GenerationStatus =
  | "idle"
  | "running"
  | "awaiting"
  | "done"
  | "failed";

export type GenerationErrorCode =
  | "UNREPAIRABLE"
  | "CREDITS_EXHAUSTED"
  | "MISCONFIGURED"
  | "STALLED"
  | "CANCELLED"
  | "LLM_FAILED"
  /** A destination the user chose needs an account linked before it can build. */
  | "NEEDS_CONNECTION"
  | "INTERNAL";

/** Validation finding, as surfaced to the UI. */
export interface GenerationValidationIssue {
  code: string;
  severity: "fatal" | "warning";
  message: string;
  nodeId?: string;
  edge?: Edge;
}

export interface GenerationPlan {
  title: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: string[];
}

/**
 * Version of this protocol, sent on the `session` frame.
 *
 * The `session` frame is the first thing every client receives and it already
 * resets client state, which makes it the free place to negotiate. A client
 * that reads a version above the one it was built against knows to expect
 * frames it does not understand — it must ignore them rather than treat them
 * as an error, and the server does the same in the other direction.
 */
export const GENERATOR_PROTOCOL_VERSION = 1;

export type GeneratorClientMessage =
  /**
   * Build straight from a raw prompt, with no brief. Kept byte-identical for
   * the developer generate page, which is a debug surface and wants the
   * unmediated path.
   */
  | { type: "start"; prompt: string }
  /** Read a request back as a brief, and wait. */
  | { type: "ask"; prompt: string }
  /** Accept the brief — answered, or skipped wholesale — and build it. */
  | { type: "resolve"; turn: number; answers: BriefAnswers }
  /** "What should be different?" — another pass on what was just built. */
  | { type: "critique"; note: string }
  | { type: "cancel" };

export type GeneratorServerMessage =
  | {
      type: "session";
      sessionId: string;
      status: GenerationStatus;
      phase?: GenerationPhase;
      /** The request this session was started with, so a resumed page can show it. */
      prompt?: string;
      /** `GENERATOR_PROTOCOL_VERSION` of the server that sent this. */
      protocol?: number;
    }
  | { type: "phase"; phase: GenerationPhase; label: string }
  | { type: "log"; level: "info" | "warn"; message: string }
  /**
   * The request, read back. `turn` keys this the way `attempt` keys `graph` —
   * without it a replay holding both an original brief and a post-critique one
   * is indistinguishable from a duplicate.
   */
  | { type: "brief"; turn: number; brief: Brief }
  /** Offered instead of a brief when the request was too thin to read back. */
  | { type: "suggestions"; turn: number; prompts: string[] }
  /**
   * The sentence the server is actually building from. Sent so the client
   * never has to re-derive it and silently disagree.
   */
  | { type: "resolved"; turn: number; sentence: string }
  | { type: "plan"; plan: GenerationPlan }
  | { type: "graph"; workflow: Workflow; attempt: number }
  | {
      type: "validation";
      attempt: number;
      issues: GenerationValidationIssue[];
    }
  | { type: "saved"; workflowId: string; name: string }
  | { type: "run_result"; execution: WorkflowExecution }
  | {
      type: "done";
      workflowId?: string;
      executionId?: string;
      outcome: "ok" | "partial";
    }
  | {
      type: "error";
      code: GenerationErrorCode;
      message: string;
      recoverable: boolean;
    };
