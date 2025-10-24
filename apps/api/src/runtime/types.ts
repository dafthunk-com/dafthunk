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
 * Contains workflow definition and ordered node IDs that never change during execution.
 * Created once at initialization, passed by reference throughout execution.
 */
export interface WorkflowExecutionContext {
  /** The workflow definition being executed (immutable) */
  readonly workflow: Workflow;
  /** Ordered list of node IDs to execute (computed once, never modified) */
  readonly orderedNodeIds: readonly string[];
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
 *
 * Note: Status is computed on-demand using getExecutionStatus() utility.
 * This eliminates the possibility of inconsistent state between status
 * and the underlying execution tracking (executedNodes, skippedNodes, nodeErrors).
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
}

/**
 * Computes the workflow execution status from the current state.
 * This is the single source of truth for status calculation.
 *
 * Status is derived from the execution state rather than stored,
 * eliminating the possibility of inconsistent state.
 *
 * Status determination logic:
 * - "executing": Not all nodes have been visited yet
 * - "completed": All nodes visited, no errors
 * - "error": All nodes visited, at least one error
 */
export function getExecutionStatus(
  context: WorkflowExecutionContext,
  state: ExecutionState
): WorkflowExecutionStatus {
  const { orderedNodeIds } = context;
  const { executedNodes, skippedNodes, nodeErrors } = state;

  // Check if all nodes have been visited (executed, skipped, or errored)
  const allNodesVisited = orderedNodeIds.every(
    (nodeId) =>
      executedNodes.has(nodeId) ||
      skippedNodes.has(nodeId) ||
      nodeErrors.has(nodeId)
  );

  if (!allNodesVisited) {
    return "executing";
  }

  // All nodes visited - determine success or failure
  return nodeErrors.size === 0 ? "completed" : "error";
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

/**
 * Error types for workflow runtime execution.
 * Categorizes errors by their handling strategy.
 */

/**
 * Base class for all workflow-related errors
 */
export abstract class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly nodeId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Workflow validation errors - stop execution immediately
 * These are non-retryable and indicate the workflow structure is invalid.
 */
export class WorkflowValidationError extends WorkflowError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Cyclic graph error - workflow contains a cycle
 */
export class CyclicGraphError extends WorkflowError {
  constructor(
    message: string = "Unable to derive execution order. The graph may contain a cycle."
  ) {
    super(message);
  }
}

/**
 * Node execution errors - continue execution
 * These errors are recoverable at the workflow level - other nodes can still execute.
 */
export class NodeExecutionError extends WorkflowError {
  constructor(
    nodeId: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message, nodeId);
  }
}

/**
 * Node not found in workflow
 */
export class NodeNotFoundError extends NodeExecutionError {
  constructor(nodeId: string) {
    super(nodeId, `Node not found: ${nodeId}`);
  }
}

/**
 * Node type not implemented in registry
 */
export class NodeTypeNotImplementedError extends NodeExecutionError {
  constructor(nodeId: string, nodeType: string) {
    super(nodeId, `Node type not implemented: ${nodeType}`);
  }
}

/**
 * System errors - stop execution
 * These indicate infrastructure or resource issues.
 */
export class SystemError extends WorkflowError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Insufficient compute credits to run workflow
 */
export class InsufficientCreditsError extends SystemError {
  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Insufficient compute credits. Required: ${required}, Available: ${available}`
    );
  }
}
