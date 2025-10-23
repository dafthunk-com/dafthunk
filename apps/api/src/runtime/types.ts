import type {
  JsonArray,
  JsonObject,
  ObjectReference,
  Workflow,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

import type { ExecutionPlan } from "./runtime";

/**
 * Runtime value types - JSON-serializable values used during workflow execution.
 * These represent the "wire format" that flows between nodes and gets persisted.
 *
 * - Primitives: string, number, boolean
 * - ObjectReference: pointer to binary data in R2 (images, documents, etc.)
 * - JsonArray/JsonObject: structured data
 */
export type RuntimeValue =
  | string
  | number
  | boolean
  | ObjectReference
  | JsonArray
  | JsonObject;

/**
 * Runtime values for a single node.
 * Maps parameter names to their values (single or array for repeated parameters).
 *
 * Example:
 * {
 *   "prompt": "Hello world",
 *   "temperature": 0.7,
 *   "images": [{ id: "...", mimeType: "image/png" }, { id: "...", mimeType: "image/jpeg" }]
 * }
 */
export type NodeRuntimeValues = Record<string, RuntimeValue | RuntimeValue[]>;

/**
 * Runtime state for entire workflow execution.
 * Maps node IDs to their runtime values.
 *
 * Example:
 * Map {
 *   "node-1" => { "text": "output from node 1" },
 *   "node-2" => { "result": 42, "status": "completed" }
 * }
 */
export type WorkflowRuntimeState = Map<string, NodeRuntimeValues>;

/**
 * Immutable execution context.
 * Contains workflow definition and execution plan that never change during execution.
 * Created once at initialization, passed by reference throughout execution.
 */
export interface WorkflowExecutionContext {
  /** The workflow definition being executed (immutable) */
  readonly workflow: Workflow;
  /** The execution plan (computed once, never modified) */
  readonly executionPlan: ExecutionPlan;
  /** Workflow ID for reference */
  readonly workflowId: string;
  /** Organization ID for scoping */
  readonly organizationId: string;
  /** Execution instance ID */
  readonly executionId: string;
}

/**
 * Mutable execution state.
 * Tracks node outputs, execution status, and errors.
 * Updated throughout execution using immutable updates.
 */
export interface ExecutionState {
  /** Outputs from executed nodes */
  nodeOutputs: WorkflowRuntimeState;
  /** Set of successfully executed node IDs */
  executedNodes: Set<string>;
  /** Set of skipped node IDs (due to conditional logic) */
  skippedNodes: Set<string>;
  /** Map of node IDs to error messages */
  nodeErrors: Map<string, string>;
  /** Current workflow execution status */
  status: WorkflowExecutionStatus;
}
