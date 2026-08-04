import type {
  JsonArray,
  JsonObject,
  NodeType,
  ObjectReference,
  Workflow,
} from "@dafthunk/types";

import type { TriggerContext } from "./trigger";

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
export type WorkflowRuntimeState = Record<string, NodeRuntimeValues>;

/**
 * Per-run input values, keyed nodeId → inputName. Applied over the literals
 * configured on a node, but still overridden by inbound edges.
 *
 * Carried alongside the workflow rather than written into `workflow.nodes` on
 * purpose: the definition hash covers node input values, so rewriting them there
 * would make every set of inputs look like a new workflow version and fragment
 * the execution history. See `computeDefinitionHash`.
 *
 * Values that are not {@link isRuntimeValue} are ignored by the executor.
 */
export type InputOverrides = Readonly<
  Record<string, Readonly<Record<string, unknown>>>
>;

/**
 * Immutable execution context.
 * Identifies the run and carries whatever triggered it. Created once at
 * initialization and passed by reference throughout execution.
 *
 * This value round-trips through durable-step serialization, so it holds only
 * JSON-safe data. Derived structure (topological order, edge indexes) lives on
 * {@link ExecutionGraph}, which is rebuilt outside the step instead.
 */
export interface WorkflowExecutionContext {
  /** The workflow definition being executed (immutable) */
  readonly workflow: Workflow;
  /** Workflow ID for reference */
  readonly workflowId: string;
  /** Organization ID for scoping */
  readonly organizationId: string;
  /** Execution instance ID */
  readonly executionId: string;
  /** What caused this run, and the credentials needed to answer it */
  readonly trigger: TriggerContext;
  readonly inputOverrides?: InputOverrides;
}

/**
 * Mutable execution state.
 * Tracks node outputs, execution status, and errors.
 * Updated throughout execution using immutable updates.
 *
 * Note: Status is computed on-demand using getExecutionStatus() utility.
 * This eliminates the possibility of inconsistent state between status
 * and the underlying execution tracking (executedNodes, skippedNodes, nodeErrors).
 */
export interface ExecutionState {
  /** Resolved inputs for executed nodes (API format, for persistence) */
  nodeInputs: WorkflowRuntimeState;
  /** Outputs from executed nodes */
  nodeOutputs: WorkflowRuntimeState;
  /** Array of successfully executed node IDs */
  executedNodes: string[];
  /** Array of skipped node IDs (due to missing inputs or upstream failures) */
  skippedNodes: string[];
  /** Record of node IDs to error messages */
  nodeErrors: Record<string, string>;
  /** Record of node IDs to their actual usage */
  nodeUsage: Record<string, number>;
}

/**
 * Result of executing a single node.
 * Immutable description of what happened - no state mutation required.
 * Used to decouple node execution from state management.
 *
 * Every field a node execution produces must travel on this result rather than
 * being written to ExecutionState as a side effect. Node execution runs inside a
 * durable step; on replay the step body is skipped and only the cached result is
 * returned, so a side-effect write would silently be lost. `inputs` is carried
 * here for exactly that reason.
 */
export type NodeExecutionResult =
  | {
      nodeId: string;
      status: "completed";
      /** Resolved inputs in API format, for persistence and display */
      inputs?: NodeRuntimeValues;
      outputs: NodeRuntimeValues;
      usage: number;
    }
  | {
      nodeId: string;
      status: "skipped";
      /** Skipped nodes don't produce outputs */
      outputs: null;
      /** Skipped nodes consume no usage */
      usage: 0;
      /** Reason for skipping (included for Workflows introspection API) */
      skipReason?: "upstream_failure" | "conditional_branch";
      /** Node IDs that caused this node to be skipped */
      blockedBy?: string[];
    }
  | {
      nodeId: string;
      status: "error";
      /** Resolved inputs, when the node failed after inputs were collected */
      inputs?: NodeRuntimeValues;
      error: string;
      /** Usage consumed before the error (e.g., API call made but parsing failed) */
      usage?: number;
    }
  | {
      nodeId: string;
      status: "pending";
      /** Resolved inputs, carried forward to the result the event resolves to */
      inputs?: NodeRuntimeValues;
      /** Event type the runtime should wait for (e.g., "agent-complete:nodeId") */
      eventType: string;
      /** How long to wait before timing out (e.g., "30 minutes") */
      timeout: string;
    };

/**
 * Skip reasons for nodes that were not executed.
 * - "upstream_failure": Node skipped because an upstream node errored or was skipped due to failure
 * - "conditional_branch": Node skipped because it's on an inactive conditional branch (expected)
 */
export type SkipReason = "upstream_failure" | "conditional_branch";

/**
 * Result of inferring why a node was skipped.
 * Includes both the classification and the specific nodes that caused the skip.
 */
export interface SkipReasonResult {
  /** Why the node was skipped */
  readonly reason: SkipReason;
  /** Node IDs that directly caused this node to be skipped */
  readonly blockedBy: readonly string[];
}

/**
 * Verdict on a node's upstream dependencies: whether it can run at all, and how
 * to describe the blockage if it can't.
 */
export interface UpstreamAnalysis extends SkipReasonResult {
  /** True when every inbound edge is blocked, so the node cannot execute */
  readonly shouldSkip: boolean;
}

/**
 * Integration data structure available at runtime.
 * Contains decrypted tokens and metadata for OAuth integrations.
 * All fields are JSON-serializable for Cloudflare Workflows compatibility.
 */
export interface IntegrationData {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly token: string;
  readonly refreshToken?: string;
  readonly tokenExpiresAt?: string; // ISO 8601 timestamp string for serialization
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Interface for executable node classes with static nodeType property.
 * Used to access node type metadata from executable node instances.
 */
export interface ExecutableNodeConstructor {
  readonly nodeType: NodeType;
  new (...args: unknown[]): unknown;
}
