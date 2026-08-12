import type { Edge, Field, WorkflowTrigger } from "@dafthunk/types";

import type { OrgResourceType } from "./org-resources";

/**
 * A workspace component the draft leans on: one the model wants reused, or one
 * it proposes creating. Names only — the resolver matches or creates, and the
 * ids stay server-side, exactly as with every other resource binding.
 */
export interface DraftResource {
  family: OrgResourceType;
  action: "use" | "create";
  /** For "use": the name as listed in the prompt. For "create": the new name. */
  name: string;
  /** Create only: one line of purpose. Lands in the instance's description. */
  description?: string;
  /** Schema only: the record shape, which is the whole of what a schema is. */
  fields?: Field[];
  /**
   * Schemas only: the node this shape belongs to.
   *
   * Every other family binds once per workflow, because an instance is a place
   * — one database is the database. A schema is a shape, and one workflow
   * routinely needs several unrelated ones: what the form asks for, what the
   * model must emit, what the table's columns are. Without this they would all
   * collapse onto the first one declared.
   */
  nodeId?: string;
}

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

/**
 * A named input set the workflow can be run against.
 *
 * Deliberately a diff rather than a complete set: `nodeValues` carries only what
 * differs from the literals already on the nodes, and the server completes it
 * from the graph. That keeps the model's output small, and means a second
 * example costs a line or two rather than a restatement of every input.
 */
export interface DraftExample {
  name: string;
  description?: string;
  /** nodeId → inputName → value, for the values that differ from the graph. */
  nodeValues?: Record<string, Record<string, unknown>>;
  /** Trigger-shaped payload; the fields depend on the workflow's trigger. */
  trigger?: Record<string, unknown>;
}

export interface GeneratedWorkflowDraft {
  title: string;
  description: string;
  trigger: WorkflowTrigger;
  /** Plain-English plan, surfaced to the user before the graph exists. */
  steps: string[];
  nodes: DraftNode[];
  edges: Edge[];
  /** Test inputs; the first one is what the generation run executes. */
  examples?: DraftExample[];
  /** Workspace components to reuse or create; resolved server-side. */
  resources?: DraftResource[];
  /**
   * Superseded by `examples[].trigger`, kept because the schema is appended to
   * the system prompt rather than constraining decoding — a model that answers
   * in the older shape still has to produce a runnable example.
   */
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
  | "TRIGGER_INVALID"
  /** The graph is well-formed but does not deliver what the brief promised. */
  | "DESTINATION_NOT_REALIZED"
  /** A node needing one of several inputs was given none of them. */
  | "MISSING_ONE_OF_INPUTS"
  /** An agent was given a tool that is not on the allowlist, or is unreadable. */
  | "UNKNOWN_TOOL";

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
