import type {
  Edge,
  Workflow,
  WorkflowExecution,
  WorkflowTrigger,
} from "./workflow";

/**
 * Wire protocol for the workflow generator socket.
 *
 * Lives here so the API and the app agree on one definition, mirroring how
 * `ClientMessage`/`ServerMessage` are shared for the editor socket.
 */

export type GenerationPhase =
  | "planning"
  | "selecting"
  | "generating"
  | "validating"
  | "repairing"
  | "saving"
  | "running"
  | "complete";

export type GenerationStatus = "idle" | "running" | "done" | "failed";

export type GenerationErrorCode =
  | "UNREPAIRABLE"
  | "CREDITS_EXHAUSTED"
  | "MISCONFIGURED"
  | "STALLED"
  | "CANCELLED"
  | "LLM_FAILED"
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

export type GeneratorClientMessage =
  | { type: "start"; prompt: string }
  | { type: "cancel" };

export type GeneratorServerMessage =
  | {
      type: "session";
      sessionId: string;
      status: GenerationStatus;
      phase?: GenerationPhase;
    }
  | { type: "phase"; phase: GenerationPhase; label: string }
  | { type: "log"; level: "info" | "warn"; message: string }
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
