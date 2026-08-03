import type { Edge, WorkflowTrigger } from "@dafthunk/types";

/**
 * What the model emits. Deliberately thinner than `Workflow`: no positions and
 * no parameter arrays, because the server materializes those from the registry.
 * That removes every hallucinated-port-shape failure, leaving only port *names*
 * on edges to validate.
 */
export interface DraftNode {
  id: string;
  type: string;
  name?: string;
  /** Literal input values keyed by input name. */
  inputs?: Record<string, unknown>;
}

export interface GeneratedWorkflowDraft {
  title: string;
  description: string;
  trigger: WorkflowTrigger;
  /** Plain-English plan, surfaced to the user before the graph exists. */
  steps: string[];
  nodes: DraftNode[];
  edges: Edge[];
  /** Simulated trigger payload for the first run; shape varies by trigger. */
  sampleTrigger?: Record<string, unknown>;
}

/**
 * Validation findings, enriched well past what `validateWorkflow` reports.
 *
 * The base validator says only "Invalid parameter reference in connection" with
 * the two node ids, which is not enough for a model (or a person) to know which
 * end was wrong. `fix` is written as an instruction because it is fed straight
 * back to the model.
 */
export type GenerationErrorCode =
  | "CYCLE_DETECTED"
  | "TYPE_MISMATCH"
  | "INVALID_CONNECTION"
  | "DUPLICATE_CONNECTION"
  | "DUPLICATE_NODE_ID"
  | "DUPLICATE_TRIGGER"
  | "EMPTY_WORKFLOW"
  | "UNKNOWN_NODE_TYPE"
  | "UNKNOWN_OUTPUT_PORT"
  | "UNKNOWN_INPUT_PORT"
  | "MISSING_REQUIRED_INPUT"
  | "ORPHAN_NODE"
  | "TRIGGER_MISMATCH"
  | "MISSING_RESPONDER"
  | "TRIGGER_INVALID";

export interface EnrichedValidationError {
  code: GenerationErrorCode;
  /** `warning` findings are shown to the user but never sent back to the model. */
  severity: "fatal" | "warning";
  /** Human-readable, for the UI. */
  message: string;
  /** Imperative instruction, for the repair prompt. */
  fix: string;
  nodeId?: string;
  edge?: Edge;
}
