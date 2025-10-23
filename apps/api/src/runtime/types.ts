import type {
  JsonArray,
  JsonObject,
  NodeType,
  ObjectReference,
  Workflow,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

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

/**
 * Execution plan types - defines how nodes are grouped for execution.
 */

/** A group of inlinable nodes executed together in a single step */
export interface InlineGroup {
  type: "inline";
  nodeIds: string[];
}

/** A single node executed as an individual step */
export interface IndividualNode {
  type: "individual";
  nodeId: string;
}

/** A unit of execution - either a single node or a group of inlinable nodes */
export type ExecutionUnit = InlineGroup | IndividualNode;

/** The complete execution plan for a workflow - ordered list of execution units */
export type ExecutionPlan = ExecutionUnit[];

/**
 * Integration data structure available at runtime.
 * Contains decrypted tokens and metadata for OAuth integrations.
 * All fields are JSON-serializable for Cloudflare Workflows compatibility.
 */
export interface IntegrationData {
  id: string;
  name: string;
  provider: string;
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: string; // ISO 8601 timestamp string for serialization
  metadata?: Record<string, unknown>;
}

/**
 * Type guard to check if a value is a valid RuntimeValue.
 * Ensures type-safe handling of runtime values throughout execution.
 */
export function isRuntimeValue(value: unknown): value is RuntimeValue {
  if (value === null || value === undefined) {
    return false;
  }

  const valueType = typeof value;

  // Primitives
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return true;
  }

  // Objects (ObjectReference, JsonObject, JsonArray)
  if (valueType === "object") {
    // ObjectReference check
    if ("id" in (value as object) && "mimeType" in (value as object)) {
      return true;
    }

    // JsonArray or JsonObject
    return true;
  }

  return false;
}

/**
 * Interface for executable node classes with static nodeType property.
 * Used to access node type metadata from executable node instances.
 */
export interface ExecutableNodeConstructor {
  readonly nodeType: NodeType;
  new (...args: unknown[]): unknown;
}

/**
 * Helper function to get NodeType from an executable node instance.
 * Provides type-safe access to static nodeType property.
 */
export function getNodeType(executable: unknown): NodeType | null {
  if (!executable || typeof executable !== "object") {
    return null;
  }

  const constructor = executable.constructor as ExecutableNodeConstructor | undefined;
  return constructor?.nodeType ?? null;
}
